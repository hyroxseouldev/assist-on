import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(new URL("../src/lib/admin/server.ts", import.meta.url), "utf8");
const start = source.indexOf("export async function getAdminProgramSessionReviewsCalendarData");
const end = source.indexOf("export async function getAdminLegalDocuments", start);
const exports = {};
let managed = [];
new Function("exports", "getManagedProgramIdsForUser", "getTenantProfileDisplayMap", ts.transpileModule(source.slice(start, end), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports, async () => managed, async (_, tenantId) => {
  assert.equal(tenantId, "xon");
  return new Map();
});
const makeReview = (id, program = "one", status = "submitted", sessionDate = "2026-08-01") => ({
  id: String(id), tenant_id: "xon", program_id: program, session_id: `s-${sessionDate}`, user_id: "member", status,
  created_at: `2026-08-01T00:00:${String(id % 60).padStart(2, "0")}Z`, reviewed_by: null,
  session: {session_date: sessionDate, title: "운동"}, program: {title: program, coach_name: "코치"},
});
let calls;
function db(rows, sessions = [], fail = false) {
  return {from(table) {
    const filters = []; let range;
    const query = {
      select() {return query;}, eq(key, value) {filters.push(row => row[key] === value); return query;},
      in(key, values) {filters.push(row => values.includes(row[key])); return query;},
      gte(key, value) {filters.push(row => row[key] >= value); return query;},
      lte(key, value) {filters.push(row => row[key] <= value); return query;},
      order() {return query;}, returns() {return query;}, range(a, b) {range = [a, b]; return query;},
      then(resolve, reject) {
        calls++;
        let data = (table === "sessions" ? sessions : rows).filter(row => filters.every(filter => filter(row)));
        if (range) data = data.slice(range[0], range[1] + 1);
        return Promise.resolve({data, error: fail && range ? {message: "failed"} : null}).then(resolve, reject);
      },
    }; return query;
  }};
}
const viewer = {tenantId: "xon", userId: "coach", tenantRole: "owner", isPlatformAdmin: false};
const range = {selectedDate: "2026-09-15", rangeStart: "2026-09-13", rangeEnd: "2026-09-19"};
const run = (client, role = "owner") => exports.getAdminProgramSessionReviewsCalendarData(client, {...viewer, tenantRole: role}, range);
let checks = 0;
const filter = process.argv.slice(2).filter(arg => arg !== "--").join(" ");
async function test(name, fn) {if (!name.includes(filter)) return; calls = 0; managed = []; await fn(); checks++; console.log(`PASS ${name}`);}
await test("전체 기간 / 선택 주 세션 없어도 과거 미답변과 상세 조회", async () => {
  const result = await run(db([makeReview(1), makeReview(2, "one", "reviewed"), {...makeReview(3), tenant_id: "other"}]));
  assert.deepEqual(result.pendingItems.map(row => row.id), ["1"]);
  assert.equal(result.items[0].session_date, "2026-08-01");
  assert.equal(result.pendingItems[0].coach_name, "코치");
  assert.equal(result.summaries.length, 0);
});
await test("페이지 / 1000건 초과 미답변도 누락 없이 조회", async () => {
  const result = await run(db(Array.from({length: 1201}, (_, i) => makeReview(i))));
  assert.equal(result.pendingItems.length, 1201);
  assert.equal(result.items.length, 1201);
});
await test("권한 / 코치는 본인 담당 프로그램만 조회", async () => {
  managed = ["one"];
  const result = await run(db([makeReview(1), makeReview(2, "two")]), "coach");
  assert.deepEqual(result.pendingItems.map(row => row.id), ["1"]);
});
await test("권한 / 미배정 코치는 전체 조회로 전환하지 않음", async () => {
  const result = await run(db([makeReview(1)]), "coach");
  assert.equal(result.pendingItems.length, 0); assert.equal(calls, 0);
});
await test("오류 / 미답변 조회 실패는 빈 목록으로 숨기지 않음", async () => {
  await assert.rejects(run(db([], [], true)), /전체 미답변/);
});
await test("달력 / 과거 미답변을 주간 집계에 포함하지 않음", async () => {
  const result = await run(db([makeReview(1), makeReview(2, "one", "reviewed", "2026-09-15")], [{id: "s-2026-09-15", tenant_id: "xon", program_id: "one", session_date: "2026-09-15"}]));
  assert.equal(result.summaries[0].totalCount, 1);
  assert.equal(result.summaries[0].reviewedCount, 1);
  assert.equal(result.pendingItems.length, 1);
});
if (!checks) throw new Error("No matching checks");
console.log(`${checks} pending review checks passed.`);
