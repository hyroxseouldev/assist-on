import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
let isPlatformAdmin = true;
let rpcCalls = [];
let writeCalls = [];
let writeError = null;
const actions = {};
new Function("exports", "require", ts.transpileModule(
  readFileSync(new URL("../src/lib/billing/actions.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText)(actions, (name) => {
  if (name === "zod") return require("zod");
  if (name === "next/cache") return { revalidatePath() {} };
  if (name === "@/lib/admin/server") return {
    async requireAdminUser(slug) {
      assert.equal(slug, "test-tenant");
      return { isPlatformAdmin, tenant: { id: tenantId }, user: { id: actorId } };
    },
  };
  if (name === "@/lib/supabase/admin") return { createSupabaseAdminClient: () => ({
    async rpc(name, params) {
      rpcCalls.push({ name, params });
      return { error: null, data: { items: [{ id: userId, full_name: "테스트 회원", email: "test@example.com",
        phone_number: "01000000000", program_change_history: ["private-history"] }], total: 11, page: params.p_page, totalPages: 2 } };
    },
    from(table) {
      assert.equal(table, "billing_member_exclusions");
      return { async upsert(values, options) { writeCalls.push({ values, options }); return { error: writeError }; } };
    },
  }) };
  if (name === "@/lib/billing/model") return { isMonth: () => true };
  if (name === "@/lib/billing/server") return {};
  throw new Error(`Unexpected import: ${name}`);
});
let checks = 0;
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
async function test(name, fn) {
  if (!name.includes(filter)) return;
  rpcCalls = []; writeCalls = []; writeError = null; isPlatformAdmin = true;
  await fn(); checks++; console.log(`PASS ${name}`);
}
await test("회원 검색 / 플랫폼 관리자만 검색·저장", async () => {
  isPlatformAdmin = false;
  await assert.rejects(actions.searchBillingExclusionUsers("test-tenant", { query: "", page: 1 }), /플랫폼 관리자/);
  await assert.rejects(actions.saveBillingMemberExclusion("test-tenant", { userId, programId: null, reason: "관계자" }), /플랫폼 관리자/);
  assert.equal(rpcCalls.length + writeCalls.length, 0);
});
await test("회원 검색 / 서버 인증 고객사·검색어·페이지 고정", async () => {
  const response = await actions.searchBillingExclusionUsers("test-tenant", { query: "  이름  ", page: 2, tenantId: "forged" });
  assert.equal(response.ok, true);
  assert.deepEqual(rpcCalls[0], { name: "search_program_change_members", params: {
    p_tenant_id: tenantId, p_actor_id: actorId, p_query: "이름", p_program_id: null,
    p_active_only: false, p_page: 2, p_page_size: 10,
  } });
  assert.equal(response.data.page, 2);
  assert.deepEqual(Object.keys(response.data.items[0]).sort(), ["email", "name", "phone", "userId"]);
});
await test("회원 검색 / 빈 검색어 전체 조회·잘못된 입력 차단", async () => {
  assert.equal((await actions.searchBillingExclusionUsers("test-tenant", { query: "", page: 1 })).ok, true);
  for (const input of [{ query: "a".repeat(101), page: 1 }, { query: "", page: 0 }, { query: "", page: 1.5 }]) {
    assert.equal((await actions.searchBillingExclusionUsers("test-tenant", input)).ok, false);
  }
  assert.equal(rpcCalls.length, 1);
});
await test("회원 검색 / 청구 이력 없이 DB 소속 검증 후 제외 저장", async () => {
  const response = await actions.saveBillingMemberExclusion("test-tenant", { userId, programId: null, reason: " 관계자 " });
  assert.equal(response.ok, true);
  assert.deepEqual(writeCalls[0].values, { tenant_id: tenantId, user_id: userId, program_id: null,
    reason: "관계자", is_active: true, updated_by: actorId });
});
await test("회원 검색 / 타 고객사 DB 거부·빈 사유 차단", async () => {
  writeError = { code: "P0001", message: "해당 고객사의 회원이 아닙니다." };
  const response = await actions.saveBillingMemberExclusion("test-tenant", { userId, programId: null, reason: "관계자" });
  assert.equal(response.ok, false);
  assert.equal(response.message, writeError.message);
  assert.equal((await actions.saveBillingMemberExclusion("test-tenant", { userId, programId: null, reason: " " })).ok, false);
  assert.equal(writeCalls.length, 1);
});
assert.ok(checks > 0, "No matching checks");
console.log(`${checks} billing user search checks passed.`);
