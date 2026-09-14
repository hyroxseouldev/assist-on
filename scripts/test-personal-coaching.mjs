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
const { applyPersonalCoachingDefaults, personalCoachingThumbnail } = load("src/lib/admin/personal-coaching.ts", {
  "@/lib/billing/model": billing,
});
const filter = process.argv.slice(2).filter((arg) => arg !== "--").join(" ");
let checks = 0;
function test(name, fn) {
  if (!name.includes(filter)) return;
  fn(); checks++; console.log(`PASS ${name}`);
}
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({personalCoaching: "true", personalMemberName: "테스트회원", title: "조작된 제목", mobileVisibility: "public", thumbnailUrl: "https://example.com/other.png", deliveryMode: "cohort_based", contentStartsOn: "2026-01-01", startDate: "2026-09-14", endDate: "2026-11-14", ...overrides})) data.set(key, value);
  return data;
}
test("생성 / 조작된 공개·기간제·이미지 덮어쓰기 및 1인 청구 분류", () => {
  const data = form();
  applyPersonalCoachingDefaults(data, "xon-training");
  assert.equal(data.get("title"), "테스트회원님 전용 하이록스 프로그램");
  assert.equal(data.get("mobileVisibility"), "members_only");
  assert.equal(data.get("deliveryMode"), "fixed_date");
  assert.equal(data.get("thumbnailUrl"), personalCoachingThumbnail("xon-training"));
  assert.equal(data.has("contentStartsOn"), false);
  assert.equal(billing.isPersonalHyroxProgram(data.get("title")), true);
});
test("수정 / 일반 화면 요청도 기존 회원 이름과 고정값 유지", () => {
  const data = form({personalCoaching: "false", personalMemberName: "다른회원"});
  applyPersonalCoachingDefaults(data, "xon-training", "원래회원님  전용 하이록스 프로그램");
  assert.equal(data.get("title"), "원래회원님 전용 하이록스 프로그램");
  assert.equal(data.get("mobileVisibility"), "members_only");
});
test("일반 프로그램 / 기존 등록 및 수정 값 보존", () => {
  const data = form({personalCoaching: "false", title: "일반 프로그램"});
  const before = [...data];
  applyPersonalCoachingDefaults(data, "xon-training", "일반 프로그램");
  assert.deepEqual([...data], before);
});
test("일반 화면 / 개인 이름 형식으로 생성해도 고정값 적용", () => {
  const data = form({personalCoaching: "false", title: "회원님 전용 하이록스 프로그램"});
  data.delete("personalMemberName");
  applyPersonalCoachingDefaults(data, "xon-training");
  assert.equal(data.get("title"), "회원님 전용 하이록스 프로그램");
  assert.equal(data.get("deliveryMode"), "fixed_date");
});
test("경계 / 다른 고객사에 엑스온 이미지 적용 금지", () => {
  assert.throws(() => applyPersonalCoachingDefaults(form(), "another-tenant"), /공통 이미지/);
  const data = form({personalCoaching: "false"});
  const before = [...data];
  applyPersonalCoachingDefaults(data, "another-tenant", "회원님 전용 하이록스 프로그램");
  assert.deepEqual([...data], before);
});
test("경계 / 일반 프로그램의 전용 화면 전환 차단", () => {
  assert.throws(() => applyPersonalCoachingDefaults(form(), "xon-training", "일반 프로그램"), /개인 코칭 프로그램만/);
});
test("검증 / 빈 이름·과도한 이름·잘못된 날짜·역전 기간", () => {
  for (const personalMemberName of [" ", "가".repeat(81), "회원\n이름"])
    assert.throws(() => applyPersonalCoachingDefaults(form({personalMemberName}), "xon-training"), /회원 이름/);
  for (const values of [{startDate: "2026-02-30"}, {endDate: "2026-08-01"}, {startDate: ""}, {endDate: "2026-99-14"}])
    assert.throws(() => applyPersonalCoachingDefaults(form(values), "xon-training"), /시작일과 종료일/);
});
if (!checks) throw new Error(`No checks matched: ${filter}`);
console.log(`${checks} personal coaching checks passed.`);
