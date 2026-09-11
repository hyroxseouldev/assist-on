import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Pure calculation tests; no credentials, network, or production writes.
const source = readFileSync(
  new URL("../src/lib/billing/model.ts", import.meta.url),
  "utf8",
);
const exports = {};
new Function(
  "exports",
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(exports);
const {
  billingWindow,
  buildBillingPreview,
  applyBillingDecisions,
  shiftMonth,
  billingReviewWindow,
  selectBillingPrograms,
  isPersonalHyroxProgram,
  singleMemberProgramIds,
  addLateJoinAdjustments,
} = exports;
let checks = 0;
const nameFilter = process.argv
  .slice(2)
  .filter((arg) => arg !== "--")
  .join(" ");
function test(name, fn) {
  if (!name.includes(nameFilter)) return;
  fn();
  checks++;
  console.log(`PASS ${name}`);
}
const contract = {
  id: "contract",
  title: "12주",
  program_ids: ["run", "station"],
  unit_price: 7500,
  starts_on: "2026-08-01",
  first_month: "2026-08",
  last_month: "2026-10",
  created_at: "",
};
const make = (overrides = {}) => ({
  id: "access",
  user_id: "member",
  program_id: "run",
  starts_at: "2026-08-20T00:00:00+09:00",
  ends_at: null,
  closed_at: null,
  needs_review: false,
  ...overrides,
});
const preview = (access, overrides = {}) =>
  buildBillingPreview({
    month: "2026-08",
    day: 18,
    contracts: [contract],
    programs: [
      { id: "run", title: "런" },
      { id: "station", title: "스테이션" },
    ],
    access,
    names: { member: "회원" },
    staffIds: [],
    programReviews: [
      { program_id: "run", created_at: `${overrides.month ?? "2026-08"}-20T00:00:00+09:00` },
      { program_id: "station", created_at: `${overrides.month ?? "2026-08"}-20T00:00:00+09:00` },
    ],
    ...overrides,
  });

test("18일 선불 / 한국시간 경계", () => {
  const w = billingWindow("2026-08", 18);
  assert.equal(w.dueDate, "2026-08-18");
  assert.equal(w.periodStart, "2026-08-18");
  assert.equal(w.periodEnd, "2026-09-17");
  assert.equal(new Date(w.endTime).toISOString(), "2026-09-17T15:00:00.000Z");
});
test("월말 및 윤년 청구일", () => {
  assert.equal(billingWindow("2026-02", 31).dueDate, "2026-02-28");
  assert.equal(billingWindow("2024-02", 31).dueDate, "2024-02-29");
  assert.equal(billingWindow("2026-03", 31).periodStart, "2026-03-31");
  assert.equal(billingWindow("2026-02", 31).periodEnd, "2026-03-30");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});
test("중간 합류 전액 / 마감 당일 합류는 다음 회차", () => {
  assert.equal(preview([make()]).total, 7500);
  assert.equal(
    preview([make({ starts_at: "2026-09-17T23:59:59+09:00" })]).total,
    7500,
  );
  assert.equal(
    preview([make({ starts_at: "2026-09-18T00:00:00+09:00" })]).total,
    0,
  );
});
test("런에서 스테이션 이동 / 재활성화 중복 제외", () => {
  const p = preview([
    make({ closed_at: "2026-08-25T00:00:00+09:00" }),
    make({
      id: "b",
      program_id: "station",
      starts_at: "2026-08-25T00:00:00+09:00",
    }),
  ]);
  assert.equal(p.quantity, 1);
  assert.equal(p.total, 7500);
  assert.equal(p.lines[0].members[0].programTitles.length, 2);
});
test("이전 기간 종료 및 기간 시작 전 미래 이용 제외", () => {
  assert.equal(
    preview([
      make({
        starts_at: "2026-08-01T00:00:00+09:00",
        ends_at: "2026-08-18T00:00:00+09:00",
      }),
    ]).total,
    0,
  );
  assert.equal(
    preview([make({ starts_at: "2026-10-01T00:00:00+09:00" })]).total,
    0,
  );
});
test("12주 프로젝트 3회 이후 청구 없음", () => {
  assert.equal(preview([make()], { month: "2026-10" }).lines[0].installment, 3);
  assert.equal(preview([make()], { month: "2026-11" }).lines.length, 0);
});
test("지속형은 이후 월도 청구", () => {
  assert.equal(
    preview([make()], {
      month: "2027-01",
      contracts: [{ ...contract, last_month: null }],
    }).total,
    7500,
  );
});
test("운영 계정 기본 제외 / 명시적 포함 허용", () => {
  const p = preview([make()], { staffIds: ["member"] });
  assert.equal(p.total, 0);
  assert.equal(
    applyBillingDecisions(
      p,
      [{ key: "contract:member", include: true, reason: "유료 참가자 확인" }],
      true,
    ).total,
    7500,
  );
});
test("불확실한 과거 이력은 검토 전 확정 불가", () => {
  const p = preview([make({ needs_review: true })]);
  assert.throws(() => applyBillingDecisions(p, [], true));
  assert.equal(
    applyBillingDecisions(
      p,
      [{ key: "contract:member", include: false, reason: "계약 전 종료" }],
      true,
    ).total,
    0,
  );
});
test("확실한 이용 구간이 있으면 과거 불확실 구간과 중복 산정 안 함", () => {
  const p = preview([
    make({ needs_review: true }),
    make({ id: "confirmed", program_id: "station" }),
  ]);
  assert.equal(p.reviewCount, 0);
  assert.equal(p.total, 7500);
});
test("미확인 대상·중복 결정·사유 없는 조정 거부", () => {
  const p = preview([make()]);
  assert.throws(() =>
    applyBillingDecisions(p, [
      { key: "other", include: false, reason: "제외" },
    ]),
  );
  assert.throws(() =>
    applyBillingDecisions(
      p,
      [{ key: "contract:member", include: false, reason: "" }],
      true,
    ),
  );
  const d = { key: "contract:member", include: false, reason: "제외" };
  assert.throws(() => applyBillingDecisions(p, [d, d]));
});
test("계약별 독립 과금 / 스냅샷 원본 불변", () => {
  const p = preview([make()], {
    contracts: [contract, { ...contract, id: "second" }],
  });
  assert.equal(p.total, 15000);
  const original = JSON.stringify(p);
  applyBillingDecisions(p, [
    { key: "contract:member", include: false, reason: "면제" },
  ]);
  assert.equal(JSON.stringify(p), original);
});
test("사유 편집 중 빈 문자열도 예상액 렌더링 유지", () => {
  const p = preview([make()]);
  assert.equal(
    applyBillingDecisions(p, [
      { key: "contract:member", include: false, reason: "" },
    ]).total,
    0,
  );
});
test("후기 조건 / 당월 달력 월과 한국시간 경계", () => {
  assert.equal(billingReviewWindow("2026-01").month, "2026-01");
  const programs = ["before", "start", "end", "after"].map((id) => ({ id, title: id }));
  const selection = selectBillingPrograms("2026-08", programs, [
    { program_id: "before", created_at: "2026-07-31T14:59:59Z" },
    { program_id: "start", created_at: "2026-07-31T15:00:00Z" },
    { program_id: "end", created_at: "2026-08-31T14:59:59Z" },
    { program_id: "after", created_at: "2026-08-31T15:00:00Z" },
  ]);
  assert.equal(selection.month, "2026-08");
  assert.deepEqual(selection.programs.map((p) => p.id), ["start", "end"]);
});
test("후기 조건 / 1건만 있어도 미작성 회원 전원 전액 산정", () => {
  const p = preview([make(), make({ id: "second", user_id: "no-review" })], {
    programReviews: [{ program_id: "run", created_at: "2026-08-01T00:00:00+09:00" }],
  });
  assert.equal(p.quantity, 2);
  assert.equal(p.total, 15000);
  assert.equal(p.programSelection.programs[0].reviewCount, 1);
});
test("후기 조건 / 후기 없는 프로그램은 인원이 있어도 제외", () => {
  const p = preview([make()], { programReviews: [] });
  assert.equal(p.total, 0);
  assert.equal(p.lines.length, 0);
  assert.equal(p.programSelection.programs.length, 0);
});
test("후기 조건 / 묶음 계약도 후기가 있는 프로그램 인원만 포함", () => {
  const p = preview([make(), make({ id: "station-only", user_id: "other", program_id: "station" })], {
    programReviews: [{ program_id: "run", created_at: "2026-08-20T00:00:00+09:00" }],
  });
  assert.equal(p.total, 7500);
  assert.deepEqual(p.lines[0].members.map((m) => m.userId), ["member"]);
});
test("후기 조건 / 공개 여부와 프로그램 기간·답변 여부 무관", () => {
  const selected = selectBillingPrograms("2026-08", [
    { id: "run", title: "비공개 종료 프로그램", mobile_visibility: "private", end_date: "2026-07-01" },
  ], [{ program_id: "run", created_at: "2026-08-20T00:00:00+09:00", status: "pending" }]);
  assert.equal(selected.programs.length, 1);
});
test("후기 조건 / 다음 월 재선정 및 확정 근거 보존", () => {
  const reviews = [{ program_id: "run", created_at: "2026-08-20T00:00:00+09:00" }];
  const p = preview([make()], { programReviews: reviews });
  const frozen = JSON.parse(JSON.stringify(applyBillingDecisions(p, [], true)));
  assert.equal(preview([make()], { month: "2026-10", programReviews: reviews }).total, 0);
  reviews.length = 0;
  assert.equal(frozen.total, 7500);
  assert.equal(frozen.programSelection.programs[0].reviewCount, 1);
  assert.notEqual(JSON.stringify(p), JSON.stringify(preview([make()], { programReviews: [] })));
});
test("자동 산정 / 계약 없이 인원·단가·상세·합계 표시", () => {
  const p = preview([make(), make({ id: "second", user_id: "second" })], { contracts: [] });
  assert.equal(p.total, 15000);
  assert.equal(p.quantity, 2);
  assert.equal(p.lines[0].source, "program");
  assert.equal(p.lines[0].members.length, 2);
  assert.equal(p.total, p.lines.reduce((sum, line) => sum + line.amount, 0));
});
test("자동 산정 / 기본 단가 변경 및 운영 계정 제외", () => {
  assert.equal(preview([make()], { contracts: [], defaultUnitPrice: 9000 }).total, 9000);
  assert.equal(preview([make()], { contracts: [], staffIds: ["member"] }).total, 0);
});
test("자동 산정 / 기존 계약 단가 우선·중복 없음", () => {
  const p = preview([make()], { contracts: [{ ...contract, unit_price: 5000 }] });
  assert.equal(p.total, 5000);
  assert.equal(p.lines.length, 1);
  assert.equal(p.lines[0].source, "contract");
});
test("자동 산정 / 종료·미래 계약은 자동 청구로 되돌아가지 않음", () => {
  assert.equal(preview([make()], { month: "2026-11" }).lines.length, 0);
  assert.equal(preview([make()], { contracts: [{ ...contract, first_month: "2026-10" }] }).lines.length, 0);
});
test("자동 산정 / 같은 프로그램의 여러 이용권은 한 명", () => {
  assert.equal(preview([make(), make({ id: "duplicate" })], { contracts: [] }).total, 7500);
});
test("청구 제외 / 자동·계약·다음 월·명단 조정에도 제외 유지", () => {
  for (const contracts of [[], [contract]]) {
    const p = preview([make()], { contracts, excludedProgramIds: ["run"] });
    assert.equal(p.total, 0);
    assert.ok(!p.programSelection.programs.some((program) => program.id === "run"));
    assert.deepEqual(p.excludedProgramIds, ["run"]);
    assert.throws(() => applyBillingDecisions(p, [{ key: "run:member", include: true, reason: "임의 포함" }], true));
    assert.equal(preview([make()], { contracts, month: "2026-10", excludedProgramIds: ["run"] }).total, 0);
  }
});
test("자동 산정 / 계약 없이 확정용 스냅샷과 인원 조정 가능", () => {
  const p = preview([make()], { contracts: [] });
  const adjusted = applyBillingDecisions(p, [{ key: "run:member", include: false, reason: "면제" }], true);
  assert.equal(adjusted.total, 0);
  assert.equal(p.total, 7500);
});
test("1인 청구 / 등록 2명 보존·청구 1명·다른 프로그램은 그대로", () => {
  const p = preview([make(), make({ id: "extra", user_id: "extra" }), make({ id: "station", program_id: "station" })], {
    contracts: [], singleMemberProgramIds: ["run"],
  });
  assert.equal(p.lines[0].members.length, 2);
  assert.equal(p.lines[0].amount, 7500);
  assert.equal(p.quantity, 2);
  assert.equal(p.total, 15000);
  assert.equal(p.lines[1].singleMemberBilling, false);
});
test("1인 청구 / 명단 조정·0명·다음 달·확정 근거", () => {
  const options = { contracts: [], singleMemberProgramIds: ["run"] };
  const p = preview([make(), make({ id: "extra", user_id: "extra" })], options);
  assert.equal(applyBillingDecisions(p, [], true).total, 7500);
  const oneExcluded = [{ key: "run:member", include: false, reason: "추가 인원" }];
  assert.equal(applyBillingDecisions(p, oneExcluded, true).total, 7500);
  assert.equal(applyBillingDecisions(p, [...oneExcluded, { key: "run:extra", include: false, reason: "이용 없음" }], true).total, 0);
  assert.equal(preview([], options).total, 0);
  assert.equal(preview([make()], { ...options, month: "2026-10" }).total, 7500);
  assert.equal(JSON.parse(JSON.stringify(p)).lines[0].singleMemberBilling, true);
  assert.deepEqual(p.singleMemberProgramIds, ["run"]);
});
test("1인 청구 / 단독 계약 단가 적용·묶음 계약 차단", () => {
  assert.equal(preview([make(), make({ id: "extra", user_id: "extra" })], {
    contracts: [{ ...contract, program_ids: ["run"], unit_price: 9000 }], singleMemberProgramIds: ["run"],
    programReviews: [{ program_id: "run", created_at: "2026-08-20T00:00:00+09:00" }],
  }).total, 9000);
  assert.throws(() => preview([make()], { singleMemberProgramIds: ["run"] }), /단독 계약/);
});
test("1인 청구 / 후기 없는 달·청구 제외·운영 계정만 있으면 0원", () => {
  const options = { contracts: [], singleMemberProgramIds: ["run"] };
  assert.equal(preview([make()], { ...options, programReviews: [] }).total, 0);
  assert.equal(preview([make()], { ...options, excludedProgramIds: ["run"] }).total, 0);
  assert.equal(preview([make()], { ...options, staffIds: ["member"] }).total, 0);
});
test("개인 프로그램 / 이름 형식·공백·영문 이름 자동 분류", () => {
  for (const title of ["고예원님 전용 하이록스 프로그램", "  이정민님  전용 하이록스 프로그램  ", "clear님 전용 하이록스 프로그램"])
    assert.equal(isPersonalHyroxProgram(title), true);
  for (const title of ["XON DANGSAN | 12주 HYROX 프로그램", "하이록스 프로그램", "님 전용 하이록스 프로그램", "고예원님 전용 하이록스 프로그램 그룹반"])
    assert.equal(isPersonalHyroxProgram(title), false);
});
test("개인 프로그램 / 수동 설정 없이 여러 개인 프로그램 각각 1명", () => {
  const programs = [
    { id: "run", title: "고예원님 전용 하이록스 프로그램" },
    { id: "station", title: "최세원님 전용 하이록스 프로그램" },
  ];
  const p = preview([make(), make({ id: "extra", user_id: "extra" }), make({ id: "s1", program_id: "station" }), make({ id: "s2", program_id: "station", user_id: "extra" })], {
    contracts: [], programs,
  });
  assert.equal(p.quantity, 2);
  assert.equal(p.total, 15000);
  assert.deepEqual(p.lines.map((line) => line.members.length), [2, 2]);
  assert.ok(p.lines.every((line) => line.singleMemberBilling));
  assert.deepEqual(singleMemberProgramIds(programs, ["run", "manual"]), ["manual", "run", "station"]);
  assert.equal(applyBillingDecisions(p, [], true).total, 15000);
});
test("개인 프로그램 / 새 개인 프로그램과 일반 그룹 계산 분리", () => {
  const p = preview([make(), make({ id: "extra", user_id: "extra" }), make({ id: "s1", program_id: "station" }), make({ id: "s2", program_id: "station", user_id: "extra" })], {
    contracts: [], programs: [{ id: "run", title: "새회원님 전용 하이록스 프로그램" }, { id: "station", title: "그룹 스테이션" }],
  });
  assert.equal(p.quantity, 3);
  assert.equal(p.total, 22500);
});
const excludeMember = (overrides = {}) => ({
  id: "exclusion", user_id: "member", program_id: "run", reason: "관계자",
  is_active: true, updated_at: "2026-09-11T00:00:00Z", ...overrides,
});
test("관계자 제외 / 일반 회원도 프로그램 제외·명단과 사유 보존", () => {
  const p = preview([make()], { memberExclusions: [excludeMember()] });
  assert.equal(p.quantity, 0);
  assert.equal(p.total, 0);
  assert.equal(p.lines[0].members.length, 1);
  assert.equal(p.lines[0].members[0].persistentExclusions[0].reason, "관계자");
  assert.equal(p.lines[0].members[0].lockedExclusion, true);
  assert.throws(() => applyBillingDecisions(p, [{ key: "contract:member", include: true, reason: "임시 포함" }], true), /먼저 해제/);
});
test("관계자 제외 / 프로그램 범위는 다른 프로그램과 다른 회원에 영향 없음", () => {
  const p = preview([make(), make({ id: "s", program_id: "station" }), make({ id: "other", user_id: "other" })], {
    contracts: [], memberExclusions: [excludeMember()],
  });
  assert.equal(p.total, 15000);
  assert.equal(p.lines.find((line) => line.contractId === "station").amount, 7500);
  assert.equal(p.lines.find((line) => line.contractId === "run").amount, 7500);
});
test("관계자 제외 / 묶음 계약의 일부 프로그램만 제외·중복 산정 안 함", () => {
  for (const accesses of [[make(), make({ id: "s", program_id: "station", needs_review: true })], [make({ id: "s", program_id: "station", needs_review: true }), make()]]) {
    const p = preview(accesses, { memberExclusions: [excludeMember()] });
    assert.equal(p.quantity, 1);
    assert.equal(p.reviewCount, 1);
    assert.equal(p.lines[0].members[0].lockedExclusion, false);
    assert.equal(p.lines[0].members[0].programIds.length, 2);
  }
});
test("관계자 제외 / 고객사 전체는 다음 달과 새 프로그램에도 적용", () => {
  const exclusions = [excludeMember({ program_id: null })];
  for (const month of ["2026-09", "2026-10"]) {
    const p = preview([make(), make({ id: "s", program_id: "station" })], { contracts: [], month, memberExclusions: exclusions });
    assert.equal(p.total, 0);
    assert.equal(p.quantity, 0);
  }
});
test("관계자 제외 / 해제하면 재포함·다른 범위 제외는 유지", () => {
  assert.equal(preview([make()], { memberExclusions: [excludeMember({ is_active: false })] }).total, 7500);
  assert.equal(preview([make()], { memberExclusions: [excludeMember(), excludeMember({ id: "tenant", program_id: null, is_active: false })] }).total, 0);
  assert.equal(preview([make()], { memberExclusions: [excludeMember({ is_active: false }), excludeMember({ id: "tenant", program_id: null })] }).total, 0);
});
test("관계자 제외 / 전용 1인 프로그램도 전원 제외하면 0원", () => {
  const p = preview([make()], { contracts: [], singleMemberProgramIds: ["run"], memberExclusions: [excludeMember()] });
  assert.equal(applyBillingDecisions(p, [], true).total, 0);
});
test("관계자 제외 / 과거 불확실 이력은 제외 시 확인 불필요·기존 스냅샷 불변", () => {
  const p = preview([make({ needs_review: true })], { memberExclusions: [excludeMember()] });
  assert.equal(p.reviewCount, 0);
  const frozen = JSON.parse(JSON.stringify(applyBillingDecisions(p, [], true)));
  assert.equal(preview([make()]).total, 7500);
  assert.equal(frozen.total, 0);
  assert.equal(frozen.memberExclusions[0].reason, "관계자");
});
test("선불 전환 / 8월과 9월 이용 기간 연속·신규 참여 증가", () => {
  const access = [make(), make({ id: "new", user_id: "new", starts_at: "2026-09-18T00:00:00+09:00" })];
  const august = preview(access);
  const september = preview(access, { month: "2026-09" });
  assert.equal(august.quantity, 1);
  assert.equal(september.quantity, 2);
  assert.equal(august.periodEnd, "2026-09-17");
  assert.equal(september.periodStart, "2026-09-18");
  assert.equal(september.programSelection.month, "2026-09");
  assert.equal(september.billingTiming, "advance");
});
test("이동 중복 / 미확인 이전 미션 7개도 통합 계약에서 7명", () => {
  const access = Array.from({ length: 7 }, (_, i) => [
    make({ id: `old${i}`, user_id: `user${i}`, needs_review: true }),
    make({ id: `new${i}`, user_id: `user${i}`, program_id: "station" }),
  ]).flat();
  const p = preview(access);
  assert.equal(p.quantity, 7);
  assert.equal(p.reviewCount, 0);
  assert.equal(applyBillingDecisions(p, [], true).total, 7 * 7500);
  assert.equal(applyBillingDecisions(p, [{ key: "contract:user0", include: false, reason: "관계자" }], true).quantity, 6);
});
const invoiceFor = (snapshot, id = "invoice-august") => ({
  id, month: snapshot.month, amount: snapshot.total, created_at: "2026-08-18T00:00:00+09:00",
  snapshot: { ...snapshot, decisions: [] },
});
const reconcile = (base, invoices, access, extra = {}) => addLateJoinAdjustments(base, invoices, {
  access, names: {}, staffIds: [], memberExclusions: [], ...extra,
});
test("중간 합류 / 다음 선불 청구에 전액·정규 인원과 별도 보고", () => {
  const invoice = invoiceFor(preview([make()]));
  const access = [make(), make({ id: "late", user_id: "late", starts_at: "2026-09-01T00:00:00+09:00" })];
  const next = reconcile(preview(access, { month: "2026-09" }), [invoice], access);
  assert.equal(next.regularQuantity, 2);
  assert.equal(next.lateJoinQuantity, 1);
  assert.equal(next.lateJoinAmount, 7500);
  assert.equal(next.total, 22500);
  const line = next.lines.find((line) => line.source === "adjustment");
  assert.equal(line.serviceMonth, "2026-08");
  assert.equal(line.members[0].joinedOn, "2026-09-01");
  assert.equal(line.members[0].userId, "late");
  assert.equal(invoice.snapshot.quantity, 1);
});
test("중간 합류 / 이미 청구·명시 제외·이동 회원 재청구 금지", () => {
  const invoice = invoiceFor(preview([make(), make({ id: "excluded", user_id: "excluded" })]));
  invoice.snapshot.decisions = [{ key: "contract:excluded", include: false, reason: "면제" }];
  const access = [make(), make({ id: "move", program_id: "station" }), make({ id: "excluded", user_id: "excluded" })];
  assert.equal(reconcile(preview(access, { month: "2026-09" }), [invoice], access).lateJoinQuantity, 0);
});
test("중간 합류 / 이전 추가 청구는 다음다음 달에 반복하지 않음", () => {
  const first = invoiceFor(preview([make()]));
  const access = [make(), make({ id: "late", user_id: "late" })];
  const second = invoiceFor(reconcile(preview(access, { month: "2026-09" }), [first], access), "invoice-september");
  const third = reconcile(preview(access, { month: "2026-10" }), [first, second], access);
  assert.equal(third.lateJoinQuantity, 0);
  assert.equal(third.quantity, 2);
});
test("중간 합류 / 종료 계약·후기 없는 다음 달에도 누락 없이 이월", () => {
  const first = invoiceFor(preview([make()], { contracts: [{ ...contract, last_month: "2026-08" }] }));
  const access = [make(), make({ id: "late", user_id: "late", ends_at: "2026-09-10T00:00:00+09:00" })];
  const next = reconcile(preview([], { month: "2026-09", programReviews: [] }), [first], access);
  assert.equal(next.regularQuantity, 0);
  assert.equal(next.lateJoinQuantity, 1);
  assert.equal(next.total, 7500);
});
test("중간 합류 / 개인 프로그램 이미 1인 청구했으면 추가 0원", () => {
  const options = { contracts: [], singleMemberProgramIds: ["run"] };
  const first = invoiceFor(preview([make()], options));
  const access = [make(), make({ id: "late", user_id: "late" })];
  assert.equal(reconcile(preview(access, { ...options, month: "2026-09" }), [first], access).lateJoinQuantity, 0);
});
test("중간 합류 / 관계자·프로그램 제외와 확정 단가 유지", () => {
  const first = invoiceFor(preview([make()], { contracts: [{ ...contract, unit_price: 8000 }] }));
  const access = [make(), make({ id: "late", user_id: "late" })];
  const base = preview(access, { month: "2026-09" });
  const next = reconcile(base, [first], access);
  assert.equal(next.lateJoinAmount, 8000);
  assert.equal(reconcile(base, [first], access, { memberExclusions: [excludeMember({ user_id: "late", program_id: null })] }).lateJoinAmount, 0);
  assert.equal(reconcile(base, [first], access, { excludedProgramIds: ["run"] }).lateJoinAmount, 0);
});
test("중간 합류 / 월말 청구는 보정 전 청구일로 이용 기간 복원", () => {
  const first = invoiceFor(preview([], { day: 31, month: "2026-02",
    contracts: [{ ...contract, starts_on: "2026-02-01", first_month: "2026-02", last_month: "2026-04" }],
  }));
  const access = [make({ starts_at: "2026-03-30T00:00:00+09:00", ends_at: "2026-03-31T00:00:00+09:00" })];
  const next = reconcile(preview([], { day: 31, month: "2026-03" }), [first], access);
  assert.equal(next.lateJoinQuantity, 1);
});
test("중간 합류 / 불확실 이력 검토·추가 제외·기존 후불 스냅샷 보존", () => {
  const first = invoiceFor(preview([make()]));
  const access = [make(), make({ id: "late", user_id: "late", needs_review: true })];
  const next = reconcile(preview([], { month: "2026-09" }), [first], access);
  assert.throws(() => applyBillingDecisions(next, [], true), /과거 이용 기간/);
  const key = next.lines.find((line) => line.source === "adjustment").members[0].key;
  assert.equal(applyBillingDecisions(next, [{ key, include: false, reason: "확인 후 면제" }], true).lateJoinQuantity, 0);
  delete first.snapshot.billingTiming;
  assert.equal(reconcile(preview([], { month: "2026-09" }), [first], access).lateJoinQuantity, 0);
});
test("중간 합류 / 1인 프로그램은 이전 추가 청구까지 합쳐 1명 한도", () => {
  const options = { contracts: [], singleMemberProgramIds: ["run"] };
  const first = invoiceFor(preview([], options));
  const access = [make()];
  const second = invoiceFor(reconcile(preview([], { ...options, month: "2026-09" }), [first], access), "invoice-september");
  assert.equal(second.snapshot.lateJoinQuantity, 1);
  const third = reconcile(preview([], { ...options, month: "2026-10" }), [first, second], [make(), make({ id: "late2", user_id: "late2" })]);
  assert.equal(third.lines.filter((line) => line.sourceInvoiceId === first.id).length, 0);
});
const manyMembers = (count) => Array.from({ length: count }, (_, i) => make({ id: `a${i}`, user_id: `u${i}` }));
test("인원 할인 / 0·49·50·51명 경계와 전체 인원 단가", () => {
  for (const count of [0, 49, 50, 51, 57, 59]) {
    const p = preview(manyMembers(count));
    assert.equal(p.quantity, count);
    assert.equal(p.lines[0].unitPrice, count >= 51 ? 6500 : 7500);
    assert.equal(p.total, count * (count >= 51 ? 6500 : 7500));
    assert.equal(p.volumeDiscount.applied, count >= 51);
  }
});
test("인원 할인 / 포함 제외로 51↔50 전환 시 원 단가 복원", () => {
  const p = preview(manyMembers(51));
  const decision = { key: "contract:u0", include: false, reason: "관계자" };
  const excluded = applyBillingDecisions(p, [decision]);
  assert.equal(excluded.total, 50 * 7500);
  assert.equal(excluded.lines[0].unitPrice, 7500);
  assert.equal(applyBillingDecisions(excluded, [{ ...decision, include: true }]).total, 51 * 6500);
  assert.equal(p.total, 51 * 6500);
  assert.equal(preview(manyMembers(51), { staffIds: ["u0"] }).volumeDiscount.applied, false);
  assert.equal(preview(manyMembers(51), { memberExclusions: [excludeMember({ user_id: "u0" })] }).volumeDiscount.applied, false);
});
test("인원 할인 / 계약·자동 프로그램 합산·이동 중복과 개인 상한", () => {
  const access = [...manyMembers(50), make({ id: "moved", user_id: "u0", program_id: "station" })];
  assert.equal(preview(access).volumeDiscount.applied, false);
  const programs = [{ id: "run", title: "그룹" }, { id: "station", title: "회원님 전용 하이록스 프로그램" }];
  const p = preview([...manyMembers(49), make({ id: "p1", user_id: "p1", program_id: "station" }), make({ id: "p2", user_id: "p2", program_id: "station" })], { contracts: [], programs });
  assert.equal(p.quantity, 50);
  assert.equal(p.volumeDiscount.applied, false);
  const combined = preview([...manyMembers(50), make({ id: "p1", user_id: "p1", program_id: "station" })], {
    contracts: [{ ...contract, program_ids: ["run"] }], programs,
  });
  assert.equal(combined.quantity, 51);
  assert.ok(combined.lines.every((line) => line.unitPrice === 6500));
  assert.equal(combined.total, 331500);
});
test("인원 할인 / 추가분은 기준 인원 제외·원 이용월 할인 단가 보존", () => {
  const original = invoiceFor(preview(manyMembers(51)));
  const access = [...manyMembers(51), make({ id: "late", user_id: "late" })];
  const next = reconcile(preview(manyMembers(50), { month: "2026-09" }), [original], access);
  assert.equal(next.regularQuantity, 50);
  assert.equal(next.lateJoinQuantity, 1);
  assert.equal(next.volumeDiscount.applied, false);
  assert.equal(next.lateJoinAmount, 6500);
  assert.equal(next.total, 50 * 7500 + 6500);
  const priorNoDiscount = invoiceFor(preview(manyMembers(50)));
  const discounted = reconcile(preview(manyMembers(51), { month: "2026-09" }), [priorNoDiscount], [...manyMembers(50), make({ id: "late", user_id: "late" })]);
  assert.equal(discounted.lateJoinAmount, 7500);
  assert.equal(discounted.total, 51 * 6500 + 7500);
});
test("인원 할인 / 낮은 별도 단가·이전 스냅샷 보존", () => {
  const p = preview(manyMembers(51), { contracts: [{ ...contract, unit_price: 5000 }] });
  assert.equal(p.total, 51 * 5000);
  const legacy = preview(manyMembers(51));
  delete legacy.volumeDiscount;
  legacy.lines[0].unitPrice = 7500;
  legacy.lines[0].amount = 51 * 7500;
  legacy.total = 51 * 7500;
  const frozen = JSON.stringify(legacy);
  assert.equal(applyBillingDecisions(legacy, []).total, 51 * 7500);
  assert.equal(JSON.stringify(legacy), frozen);
});
const preregistrationTerm = {
  user_id: "member", program_id: "run", starts_at: "2026-09-14T00:00:00+09:00",
  ends_at: "2026-11-15T23:59:59.999+09:00", first_month: "2026-09",
};
test("사전등록 첫 청구 / 9월 시작은 8월 0회·9월 1회", () => {
  const access = [make({ starts_at: preregistrationTerm.starts_at })];
  const terms = { preregistrationTerms: [preregistrationTerm] };
  assert.equal(preview(access, terms).quantity, 0);
  const september = preview(access, { ...terms, month: "2026-09" });
  assert.equal(september.quantity, 1);
  assert.equal(september.total, 7500);
  assert.equal(september.lines[0].members[0].joinedOn, "2026-09-14");
  assert.equal(preview(access, { ...terms, month: "2026-10" }).quantity, 1);
});
test("사전등록 첫 청구 / 9월 14~17일 추가 청구로 부활 금지", () => {
  const access = [make({ starts_at: preregistrationTerm.starts_at })];
  const terms = { preregistrationTerms: [preregistrationTerm] };
  const august = invoiceFor(preview([], terms));
  const before = JSON.stringify(august);
  const september = reconcile(preview(access, { ...terms, month: "2026-09" }), [august], access, terms);
  assert.equal(september.regularQuantity, 1);
  assert.equal(september.lateJoinQuantity, 0);
  assert.equal(september.total, 7500);
  assert.equal(JSON.stringify(august), before);
});
test("사전등록 첫 청구 / 미가입 명단은 0명·가입 연결 후 반영", () => {
  const access = [make({ starts_at: preregistrationTerm.starts_at })];
  const unmatched = { preregistrationTerms: [{ ...preregistrationTerm, user_id: null }] };
  assert.equal(preview([], { ...unmatched, month: "2026-09" }).quantity, 0);
  // An unmatched row cannot accidentally suppress a different user's access.
  assert.equal(preview(access, unmatched).quantity, 1);
  assert.equal(preview(access, { preregistrationTerms: [preregistrationTerm] }).quantity, 0);
});
test("사전등록 첫 청구 / 다른 회원·프로그램·기존 이용권 보존", () => {
  const terms = { preregistrationTerms: [preregistrationTerm] };
  assert.equal(preview([make({ starts_at: "2026-08-17T00:00:00+09:00" })], terms).quantity, 1);
  assert.equal(preview([make({ starts_at: preregistrationTerm.starts_at, program_id: "station" })], terms).quantity, 1);
  assert.equal(preview([make({ starts_at: preregistrationTerm.starts_at, user_id: "someone-else" })], terms).quantity, 1);
  assert.equal(preview([make({ starts_at: preregistrationTerm.starts_at })]).quantity, 1);
});
test("사전등록 첫 청구 / 오류 이력은 0일·올바른 신규 구간만 계산", () => {
  const access = [make({ starts_at: "2026-08-17T00:00:00+09:00", closed_at: "2026-08-17T00:00:00+09:00" }),
    make({ id: "corrected", starts_at: preregistrationTerm.starts_at })];
  const terms = { preregistrationTerms: [preregistrationTerm] };
  assert.equal(preview(access, terms).quantity, 0);
  assert.equal(preview(access, { ...terms, month: "2026-09" }).quantity, 1);
});
test("사전등록 첫 청구 / 관계자 제외·1인 상한·할인 기준 유지", () => {
  const terms = { preregistrationTerms: [preregistrationTerm], month: "2026-09" };
  const access = [make({ starts_at: preregistrationTerm.starts_at })];
  assert.equal(preview(access, { ...terms, staffIds: ["member"] }).quantity, 0);
  const all = [...manyMembers(50), ...access];
  assert.equal(preview(all, { preregistrationTerms: [preregistrationTerm] }).total, 50 * 7500);
  assert.equal(preview(all, terms).total, 51 * 6500);
});
assert.ok(checks > 0, "No billing checks matched the name filter.");
console.log(`${checks} billing checks passed.`);
