import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/admin/monthly-analytics.ts", import.meta.url), "utf8");
const exports = {};
new Function("exports", ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports);

const profiles = [
  { user_id: "zero", display_name: "공기환", is_active: true },
  { user_id: "responder", display_name: "답변 코치", is_active: true },
  { user_id: "former", display_name: "이전 코치", is_active: false },
  { user_id: "inactive", display_name: "비활성 코치", is_active: false },
];
const answer = (id, reviewedBy) => ({
  id, program_id: "program", status: "reviewed", coach_feedback: "좋습니다",
  reviewed_by: reviewedBy, reviewed_at: "2026-09-02T01:00:00Z", created_at: "2026-09-02T00:00:00Z",
});

// Exercise the report without credentials or network access, including query scope.
async function report(reviews) {
  const db = {
    from(table) {
      const rows = { programs: [], coach_profiles: profiles, program_session_reviews: reviews }[table];
      assert.ok(rows, `Unexpected table: ${table}`);
      const query = {
        select(columns) {
          if (table === "coach_profiles") assert.ok(columns.split(", ").includes("is_active"));
          return query;
        },
        eq(column, value) {
          assert.equal(column, "tenant_id");
          assert.equal(value, "tenant");
          return query;
        },
        gte(column, value) {
          assert.equal(column, "created_at");
          assert.equal(value, "2026-08-31T15:00:00.000Z");
          return query;
        },
        lt(column, value) {
          assert.equal(column, "created_at");
          assert.equal(value, "2026-09-30T15:00:00.000Z");
          return query;
        },
        order() { return query; },
        range() { return query; },
        returns() { return Promise.resolve({ data: rows, error: null }); },
      };
      return query;
    },
  };
  return exports.getMonthlyAnalyticsReport(db, "tenant", "2026-09");
}

let checks = 0;
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
async function test(name, check) {
  if (!name.includes(filter)) return;
  await check();
  checks++;
  console.log(`PASS ${name}`);
}

await test("활성 코치 0건 포함 및 기존 답변 집계 보존", async () => {
  const result = await report([answer("one", "responder"), answer("two", "responder"), answer("three", "former")]);
  const zero = result.coaches.find((coach) => coach.userId === "zero");
  assert.ok(zero);
  assert.equal(zero.name, "공기환");
  assert.equal(zero.replyCount, 0);
  assert.equal(zero.contributionRate, 0);
  assert.equal(zero.medianResponseHours, null);
  assert.equal(zero.within24Rate, null);
  assert.equal(zero.within48Rate, null);
  assert.deepEqual(result.coaches.map((coach) => coach.userId), ["responder", "former", "zero"]);
  assert.equal(result.coaches[0].replyCount, 2);
  assert.equal(result.coaches[0].contributionRate, 66.7);
  assert.equal(result.coaches[0].medianResponseHours, 1);
  assert.equal(result.summary.activeCoachCount, 2);
  assert.equal(result.summary.answeredCount, 3);
});

await test("미답변 후기와 답변 없는 월에도 활성 코치 유지", async () => {
  for (const reviews of [[], [{ ...answer("pending", "zero"), status: "pending", coach_feedback: null }]]) {
    const result = await report(reviews);
    assert.equal(result.summary.answeredCount, 0);
    assert.equal(result.summary.activeCoachCount, 2);
    assert.equal(result.coaches.length, 2);
    assert.ok(result.coaches.every((coach) => coach.replyCount === 0 && coach.contributionRate === 0));
  }
});

await test("프로필 없는 실제 답변자도 보존하고 활동 인원에서 제외", async () => {
  const result = await report([answer("unknown", "missing-profile"), answer("unassigned", null)]);
  assert.equal(result.coaches.length, 4);
  assert.equal(result.summary.activeCoachCount, 2);
  assert.equal(result.coaches.reduce((total, coach) => total + coach.replyCount, 0), 2);
  assert.equal(result.coaches.find((coach) => coach.userId === "unassigned").name, "답변자 정보 없음");
});

assert.ok(checks > 0, "No monthly analytics checks matched the name filter.");
console.log(`${checks} monthly analytics checks passed.`);
