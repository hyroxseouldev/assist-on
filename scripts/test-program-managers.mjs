import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const programId = "33333333-3333-4333-8333-333333333333";
const managerId = "44444444-4444-4444-8444-444444444444";
let context;
let readError;
let rpcError;
let assignments;
let calls;
let paths;
let filters;
function load(path, imports) {
  const exports = {};
  new Function("exports", "require", ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(exports, (name) => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  });
  return exports;
}
const db = {
  from(table) {
    assert.equal(table, "program_managers");
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      then(resolve) { resolve({ data: assignments, error: readError }); },
    };
    return query;
  },
  async rpc(name, args) { calls.push({ name, args }); return { error: rpcError }; },
};
const supabase = { createSupabaseAdminClient: () => db };
const scope = load("src/lib/admin/program-managers.ts", { "server-only": {}, "@/lib/supabase/admin": supabase });
const actions = load("src/lib/admin/program-manager-actions.ts", {
  "next/cache": { revalidatePath: (...args) => paths.push(args) },
  zod: require("zod"),
  "@/lib/admin/server": { requireAdminUser: async () => context },
  "@/lib/supabase/admin": supabase,
});
let checks = 0;
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
async function test(name, run) {
  if (!name.includes(filter)) return;
  context = { tenant: { id: tenantId }, user: { id: actorId }, tenantRole: "owner", isPlatformAdmin: false };
  assignments = [{ program_id: programId }];
  readError = null; rpcError = null; calls = []; paths = []; filters = [];
  await run(); checks++; console.log(`PASS ${name}`);
}
await test("배정 / 오너 전체 접근·매니저 본인 테넌트 범위", async () => {
  assert.equal(await scope.getManagerProgramScope(context), null);
  assert.equal(filters.length, 0);
  context.tenantRole = "manager";
  assert.deepEqual(await scope.getManagerProgramScope(context), [programId]);
  assert.deepEqual(filters, [["tenant_id", tenantId], ["manager_user_id", actorId]]);
});
await test("미배정 / 빈 목록을 전체 권한으로 해석하지 않음", async () => {
  context.tenantRole = "manager"; assignments = [];
  assert.deepEqual(await scope.getManagerProgramScope(context), []);
  const programs = [{ id: programId }, { id: managerId }];
  assert.deepEqual(scope.filterAssignedPrograms(programs, []), []);
  assert.deepEqual(scope.filterAssignedPrograms(programs, [programId]), [programs[0]]);
  assert.deepEqual(scope.filterAssignedPrograms(programs, null), programs);
  context.tenantRole = "coach";
  assert.deepEqual(await scope.getManagerProgramScope(context), []);
});
await test("조회 오류 / 담당 목록 실패 시 권한 확대 금지", async () => {
  context.tenantRole = "manager"; readError = { code: "504" };
  await assert.rejects(scope.getManagerProgramScope(context), /불러오지 못했습니다/);
});
await test("배정 저장 / 매니저·코치·일반 회원 변경 금지", async () => {
  for (const role of ["manager", "coach", "member"]) {
    context.tenantRole = role;
    assert.equal((await actions.saveProgramManagers("test", { programId, managerIds: [managerId] })).ok, false);
  }
  assert.equal(calls.length, 0);
});
await test("배정 저장 / 서버 계정과 테넌트 사용·중복 제거", async () => {
  const result = await actions.saveProgramManagers("test", { programId, managerIds: [managerId, managerId], actorId: managerId, tenantId: managerId });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ name: "set_program_managers", args: {
    p_tenant_id: tenantId, p_actor_id: actorId, p_program_id: programId, p_manager_ids: [managerId],
  } }]);
  assert.deepEqual(paths, [["/admin", "layout"], ["/t/test/admin", "layout"]]);
});
await test("배정 해제 / 빈 배열 저장 및 플랫폼 관리자 허용", async () => {
  context.tenantRole = "member"; context.isPlatformAdmin = true;
  assert.equal((await actions.saveProgramManagers("test", { programId, managerIds: [] })).ok, true);
  assert.deepEqual(calls[0].args.p_manager_ids, []);
});
await test("입력 검증 / 잘못된 ID 및 과도한 목록 차단", async () => {
  for (const input of [{ programId: "bad", managerIds: [] }, { programId, managerIds: ["bad"] }, { programId, managerIds: Array(101).fill(managerId) }]) {
    assert.equal((await actions.saveProgramManagers("test", input)).ok, false);
  }
  assert.equal(calls.length, 0);
});
await test("실패 / 저장 오류 시 성공 처리 및 원문 노출 금지", async () => {
  rpcError = { code: "42501", message: "private db message" };
  const original = console.error;
  console.error = () => {};
  try {
    const result = await actions.saveProgramManagers("test", { programId, managerIds: [managerId] });
    assert.equal(result.ok, false);
    assert.ok(!result.message.includes("private"));
    assert.equal(paths.length, 0);
  } finally { console.error = original; }
});
assert.ok(checks > 0, `No checks matched: ${filter}`);
console.log(`${checks} program manager checks passed.`);
