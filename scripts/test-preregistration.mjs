import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function compile(source, bindings = {}) {
  const exports = {};
  new Function("exports", ...Object.keys(bindings), ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(exports, ...Object.values(bindings));
  return exports;
}
const source = readFileSync("src/lib/admin/actions.ts", "utf8");
const ast = ts.createSourceFile("actions.ts", source, ts.ScriptTarget.Latest, true);
const extracted = ast.statements.filter((node) => ts.isFunctionDeclaration(node)
  && ["registerProgramRosterAction", "createPreregistrationCohortAction"].includes(node.name?.text)).map((node) => node.getText(ast)).join("\n");
const roster = compile(readFileSync("src/lib/admin/preregistration.ts", "utf8"));
const dates = compile(readFileSync("src/lib/program/cohorts.ts", "utf8"), {
  require: () => ({ addDays: (date, days) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10) }),
});
let mode, cohort, allowed, rpcError, calls, filters;
const db = {
  from(table) {
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([table, key, value]); return query; },
      async maybeSingle() {
        return { data: table === "programs" ? { id: "program", delivery_mode: mode,
          content_starts_on: "2026-06-07", content_ends_on: "2026-07-06" } : cohort, error: null };
      },
    };
    return query;
  },
  async rpc(name, args) { calls.push({ name, args }); return { data: "new-cohort", error: rpcError }; },
};
const actions = compile(extracted, {
  ...roster, ...dates,
  ensureAdmin: async () => ({ tenant: { id: "tenant", slug: "amor" }, user: { id: "actor" }, canManagePrograms: allowed }),
  requireTenantSlug: async () => "amor",
  createSupabaseAdminClient: () => db,
  revalidateAdminPath: () => {},
  ok: (message) => ({ ok: true, message }),
  fail: (error) => ({ ok: false, message: error.message }),
});
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
let count = 0;
async function test(name, fn) {
  if (!name.includes(filter)) return;
  mode = "cohort_based"; cohort = { id: "cohort", starts_on: "2099-09-20" };
  allowed = true; rpcError = null; calls = []; filters = [];
  await fn(); count++; console.log("PASS", name);
}
function form(extra = {}) {
  const data = new FormData();
  Object.entries({ programId: "program", cohortId: "cohort", roster: "테스트 01012345678",
    startsOn: "2099-01-01", endsOn: "2099-12-31", expiresOn: "2099-09-30", ...extra })
    .forEach(([key, value]) => data.set(key, value));
  return data;
}
await test("기수 / 제출 날짜를 무시하고 서버 기수 시작일과 콘텐츠 기간으로 계산", async () => {
  assert.equal((await actions.registerProgramRosterAction(form())).ok, true);
  assert.equal(calls[0].args.p_starts_at, "2099-09-19T15:00:00.000Z");
  assert.equal(calls[0].args.p_ends_at, "2099-10-19T14:59:59.000Z");
  assert.equal(calls[0].args.p_cohort_id, "cohort");
  assert.ok(filters.some(([table, key, value]) => table === "program_cohorts" && key === "tenant_id" && value === "tenant"));
  assert.ok(filters.some(([table, key, value]) => table === "program_cohorts" && key === "program_id" && value === "program"));
});
await test("기수 / 다른 프로그램 또는 없는 기수 거부", async () => {
  cohort = null;
  assert.equal((await actions.registerProgramRosterAction(form())).ok, false);
  assert.equal(calls.length, 0);
});
await test("기간 / 자동 계산한 종료일 이후 가입 마감 거부", async () => {
  assert.equal((await actions.registerProgramRosterAction(form({ expiresOn: "2099-11-01" }))).ok, false);
  assert.equal(calls.length, 0);
});
await test("고정형 / 기존 직접 지정 날짜 유지", async () => {
  mode = "fixed_date";
  assert.equal((await actions.registerProgramRosterAction(form({ cohortId: "" }))).ok, true);
  assert.equal(calls[0].args.p_starts_at, "2098-12-31T15:00:00.000Z");
  assert.equal(calls[0].args.p_cohort_id, null);
});
await test("권한 / 일반 회원 생성과 등록 차단", async () => {
  allowed = false;
  assert.equal((await actions.registerProgramRosterAction(form())).ok, false);
  assert.equal((await actions.createPreregistrationCohortAction(form({ name: "3기" }))).ok, false);
  assert.equal(calls.length, 0);
});
await test("생성 / 이름 시작일 및 서버 사용자 전달", async () => {
  const result = await actions.createPreregistrationCohortAction(form({ name: " 3기 ", startsOn: "2099-09-20" }));
  assert.deepEqual(result.cohort, { id: "new-cohort", name: "3기", starts_on: "2099-09-20" });
  assert.equal(calls[0].args.p_actor_id, "actor");
});
await test("생성 / 잘못된 날짜 및 담당 권한 오류 처리", async () => {
  assert.equal((await actions.createPreregistrationCohortAction(form({ name: "3기", startsOn: "2099-02-30" }))).ok, false);
  rpcError = { message: "담당 프로그램만 가능" };
  assert.equal((await actions.createPreregistrationCohortAction(form({ name: "3기" }))).ok, false);
});
assert.ok(count > 0);
console.log(count + " checks passed");
