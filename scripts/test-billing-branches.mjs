import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, imports = {}) {
  const exports = {};
  new Function("exports", "require", ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(exports, (name) => {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  });
  return exports;
}
const billing = load("src/lib/billing/model.ts");
const { groupBillingByBranch } = load("src/lib/billing/branches.ts", { "@/lib/billing/model": billing });
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
let checks = 0;
function test(name, fn) {
  if (!name.includes(filter)) return;
  fn();
  checks++;
  console.log(`PASS ${name}`);
}
function member(key, overrides = {}) {
  return { key, userId: key, name: key, joinedOn: "2026-11-18", programTitles: [],
    needsReview: false, excludedByDefault: false, ...overrides };
}
function line(contractId, title, overrides = {}) {
  return { contractId, title, source: "program", unitPrice: 7500, installment: 1,
    totalInstallments: null, members: [member(contractId)], amount: 7500, ...overrides };
}
function preview(lines, overrides = {}) {
  return { month: "2026-11", dueDate: "2026-11-18", periodStart: "2026-11-18",
    periodEnd: "2026-12-17", lines, total: lines.reduce((sum, item) => sum + item.amount, 0),
    quantity: lines.length, reviewCount: 0, ...overrides };
}
function group(groups, id) {
  return groups.find((item) => item.id === id);
}
function assertTotals(groups, result) {
  assert.equal(groups.reduce((sum, item) => sum + item.total, 0), result.total);
  assert.equal(groups.reduce((sum, item) => sum + item.regularQuantity, 0), result.regularQuantity);
  assert.equal(groups.reduce((sum, item) => sum + item.lateJoinQuantity, 0), result.lateJoinQuantity);
  assert.equal(groups.reduce((sum, item) => sum + item.lateJoinAmount, 0), result.lateJoinAmount);
  assert.equal(groups.flatMap((item) => item.lines).length, result.lines.length);
}

test("지점 구분 / 한글·영문 이름과 미분류 항목 보존", () => {
  const result = billing.applyBillingDecisions(preview([
    line("j1", "잠실 12주 프로젝트"), line("d1", "당산 8주 프로그램"),
    line("j2", "[JAMSIL] RUN"), line("d2", "[dangsan] HYROX CAMPAIGN"),
    line("personal", "회원님 전용 하이록스 프로그램"),
  ]), []);
  const groups = groupBillingByBranch(result, []);
  assert.deepEqual(groups.map((item) => item.label), ["잠실", "당산", "기타·미분류"]);
  assert.deepEqual(group(groups, "jamsil").lines.map((item) => item.contractId), ["j1", "j2"]);
  assert.deepEqual(group(groups, "dangsan").lines.map((item) => item.contractId), ["d1", "d2"]);
  assert.equal(group(groups, "other").total, 7500);
  assertTotals(groups, result);
});

test("지점 구분 / 계약명에 지점이 없어도 저장된 프로그램명·구형 명단 사용", () => {
  const result = preview([
    line("contract", "12주 통합 계약", { source: "contract", programIds: ["run", "station"], members: [], amount: 0 }),
    line("legacy", "이전 계약", { source: undefined, members: [member("legacy", { programTitles: ["당산 런"] })] }),
  ], { programSelection: { rule: "current_calendar_month_reviews", month: "2026-11",
    programs: [{ id: "run", title: "잠실 런", reviewCount: 1 }, { id: "station", title: "잠실 스테이션", reviewCount: 1 }] } });
  const groups = groupBillingByBranch(result, []);
  assert.equal(group(groups, "jamsil").lines[0].contractId, "contract");
  assert.equal(group(groups, "dangsan").lines[0].contractId, "legacy");
  assert.equal(group(groups, "other"), undefined);
});

test("지점 구분 / 두 지점 통합 계약은 중복 없이 공통에 한 번 표시", () => {
  const result = billing.applyBillingDecisions(preview([
    line("both", "통합 계약", { source: "contract", members: [member("both", { programTitles: ["잠실 런", "당산 런"] })] }),
    line("named", "잠실·당산 공통 계약"),
  ]), []);
  const groups = groupBillingByBranch(result, []);
  assert.equal(group(groups, "shared").regularQuantity, 2);
  assert.equal(group(groups, "shared").total, 15000);
  assert.equal(group(groups, "jamsil").total, 0);
  assert.equal(group(groups, "dangsan").total, 0);
  assertTotals(groups, result);
});

test("할인 / 잠실 30명·당산 21명은 전체 51명 할인 유지·조정 즉시 반영", () => {
  const programs = [{ id: "j", title: "잠실 런" }, { id: "d", title: "당산 런" }];
  const result = billing.buildBillingPreview({
    month: "2026-11", day: 18, contracts: [], programs, names: {}, staffIds: [],
    programReviews: programs.map((program) => ({ program_id: program.id, created_at: "2026-11-03T00:00:00+09:00" })),
    access: Array.from({ length: 51 }, (_, index) => ({ id: `access-${index}`, user_id: `user-${index}`,
      program_id: index < 30 ? "j" : "d", starts_at: "2026-11-01T00:00:00+09:00",
      ends_at: null, closed_at: null, needs_review: false })),
  });
  const before = structuredClone(result);
  const groups = groupBillingByBranch(result, []);
  assert.equal(group(groups, "jamsil").total, 30 * 6500);
  assert.equal(group(groups, "dangsan").total, 21 * 6500);
  assertTotals(groups, result);
  assert.deepEqual(result, before);

  const decisions = [{ key: result.lines[0].members[0].key, include: false, reason: "이번 달 제외" }];
  const adjusted = billing.applyBillingDecisions(result, decisions);
  const adjustedGroups = groupBillingByBranch(adjusted, decisions);
  assert.equal(group(adjustedGroups, "jamsil").total, 29 * 7500);
  assert.equal(group(adjustedGroups, "dangsan").total, 21 * 7500);
  assertTotals(adjustedGroups, adjusted);
});

test("인원 / 1인 상한·관계자 제외·수동 포함과 무료 단가", () => {
  const decisions = [{ key: "staff", include: true, reason: "실제 이용" }];
  const result = billing.applyBillingDecisions(preview([
    line("single", "잠실 개인 프로그램", { singleMemberBilling: true, members: [member("a"), member("b")] }),
    line("free", "당산 무료 프로그램", { unitPrice: 0, members: [member("free"), member("staff", { excludedByDefault: true }),
      member("locked", { lockedExclusion: true, excludedByDefault: true })] }),
  ]), decisions);
  const groups = groupBillingByBranch(result, decisions);
  assert.equal(group(groups, "jamsil").regularQuantity, 1);
  assert.equal(group(groups, "dangsan").regularQuantity, 2);
  assert.equal(group(groups, "dangsan").total, 0);
  assertTotals(groups, result);
});

test("확정 내역 / 중간 합류는 원래 지점·금액·확정 결정 보존", () => {
  const decisions = [{ key: "excluded", include: false, reason: "확정 당시 제외" }];
  const snapshot = billing.applyBillingDecisions(preview([
    line("regular", "당산 런"),
    line("late", "이전 계약", { source: "adjustment", serviceMonth: "2026-10", programIds: ["renamed"], unitPrice: 6000,
      members: [member("late", { programTitles: ["잠실 런"] }), member("excluded", { programTitles: ["잠실 런"] })] }),
  ], { programSelection: { rule: "current_calendar_month_reviews", month: "2026-11",
    programs: [{ id: "renamed", title: "당산으로 변경된 프로그램", reviewCount: 1 }] } }), decisions);
  snapshot.decisions = decisions;
  const before = structuredClone(snapshot);
  const groups = groupBillingByBranch(snapshot, snapshot.decisions);
  assert.equal(group(groups, "jamsil").regularQuantity, 0);
  assert.equal(group(groups, "jamsil").lateJoinQuantity, 1);
  assert.equal(group(groups, "jamsil").lateJoinAmount, 6000);
  assert.equal(group(groups, "dangsan").total, 7500);
  assertTotals(groups, snapshot);
  assert.deepEqual(snapshot, before);
});

test("빈 청구 / 잠실·당산 각각 0명·0원 표시", () => {
  const result = billing.applyBillingDecisions(preview([]), []);
  const groups = groupBillingByBranch(result, []);
  assert.deepEqual(groups.map((item) => [item.label, item.regularQuantity, item.total]), [["잠실", 0, 0], ["당산", 0, 0]]);
  assertTotals(groups, result);
});

if (!checks) throw new Error(`No checks matched: ${filter}`);
console.log(`${checks} billing branch checks passed.`);
