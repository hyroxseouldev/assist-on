export type BillingSettings = {
  billing_day: number;
  unit_price: number;
  excluded_program_ids: string[];
  single_member_program_ids: string[];
};
export type BillingProgram = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  mobile_visibility: string;
};
export type BillingContract = {
  id: string;
  title: string;
  program_ids: string[];
  unit_price: number;
  starts_on: string;
  first_month: string;
  last_month: string | null;
  created_at: string;
};
export type BillingAccess = {
  id: string;
  user_id: string;
  program_id: string;
  starts_at: string;
  ends_at: string | null;
  closed_at: string | null;
  needs_review: boolean;
};
export type BillingProgramReview = {
  program_id: string;
  created_at: string;
};
export type BillingPreregistrationTerm = {
  user_id: string | null;
  program_id: string;
  starts_at: string;
  ends_at: string;
  first_month: string;
};
export type BillingProgramSelection = {
  rule: "previous_calendar_month_reviews" | "current_calendar_month_reviews";
  month: string;
  programs: { id: string; title: string; reviewCount: number }[];
};
export type BillingMember = {
  key: string;
  userId: string;
  name: string;
  joinedOn: string;
  programTitles: string[];
  needsReview: boolean;
  excludedByDefault: boolean;
  programIds?: string[];
  lockedExclusion?: boolean;
  persistentExclusions?: BillingMemberExclusion[];
};
export type BillingMemberExclusion = {
  id: string;
  user_id: string;
  program_id: string | null;
  reason: string;
  is_active: boolean;
  updated_at: string;
};
export type BillingLine = {
  contractId: string;
  programIds?: string[];
  source?: "contract" | "program" | "adjustment";
  serviceStartsOn?: string;
  sourceInvoiceId?: string;
  sourceLineId?: string;
  serviceMonth?: string;
  singleMemberBilling?: boolean;
  title: string;
  unitPrice: number;
  baseUnitPrice?: number;
  installment: number;
  totalInstallments: number | null;
  members: BillingMember[];
  amount: number;
};
export type BillingPreview = {
  billingTiming?: "advance";
  billingDay?: number;
  month: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  lines: BillingLine[];
  total: number;
  quantity: number;
  regularQuantity?: number;
  lateJoinQuantity?: number;
  lateJoinAmount?: number;
  volumeDiscount?: { minimumQuantity: number; unitPrice: number; applied: boolean };
  reviewCount: number;
  // Optional only for invoices finalized before this rule was introduced.
  programSelection?: BillingProgramSelection;
  excludedProgramIds?: string[];
  singleMemberProgramIds?: string[];
  memberExclusions?: BillingMemberExclusion[];
};
export type BillingDecision = { key: string; include: boolean; reason: string };
export type BillingInvoice = {
  id: string;
  month: string;
  amount: number;
  created_at: string;
  paid_at: string | null;
  payment_note: string | null;
  snapshot: BillingPreview & { decisions: BillingDecision[] };
};

export function isMonth(value: string) {
  return (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    Number(value.slice(0, 4)) >= 2000 &&
    Number(value.slice(0, 4)) <= 2200
  );
}
export function shiftMonth(month: string, delta: number) {
  if (!isMonth(month)) throw new Error("청구월을 확인해 주세요.");
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
export function monthDistance(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + tm - fm;
}
export function kstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
export function billingWindow(month: string, day: number) {
  if (!isMonth(month) || !Number.isInteger(day) || day < 1 || day > 31)
    throw new Error("청구일을 확인해 주세요.");
  const at = (m: string) => {
    const [y, n] = m.split("-").map(Number);
    const last = new Date(Date.UTC(y, n, 0)).getUTCDate();
    return `${m}-${String(Math.min(day, last)).padStart(2, "0")}`;
  };
  const dueDate = at(month);
  const periodStart = dueDate;
  const nextDueDate = at(shiftMonth(month, 1));
  const periodEnd = new Date(Date.parse(`${nextDueDate}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
  return {
    dueDate,
    periodStart,
    periodEnd,
    startTime: Date.parse(`${periodStart}T00:00:00+09:00`),
    endTime: Date.parse(`${nextDueDate}T00:00:00+09:00`),
  };
}

export function billingReviewWindow(invoiceMonth: string) {
  const month = invoiceMonth;
  return {
    month,
    start: `${month}-01T00:00:00+09:00`,
    end: `${shiftMonth(invoiceMonth, 1)}-01T00:00:00+09:00`,
  };
}

export function selectBillingPrograms(
  invoiceMonth: string,
  programs: BillingProgram[],
  reviews: BillingProgramReview[],
): BillingProgramSelection {
  const window = billingReviewWindow(invoiceMonth);
  const start = Date.parse(window.start);
  const end = Date.parse(window.end);
  const counts = new Map<string, number>();
  for (const review of reviews) {
    const createdAt = Date.parse(review.created_at);
    if (createdAt >= start && createdAt < end) {
      counts.set(review.program_id, (counts.get(review.program_id) ?? 0) + 1);
    }
  }
  // Match monthly analytics: creation month only, regardless of visibility,
  // assigned coach, program dates, or whether a coach has answered.
  return {
    rule: "current_calendar_month_reviews",
    month: window.month,
    programs: programs
      .filter((p) => counts.has(p.id))
      .map((p) => ({ id: p.id, title: p.title, reviewCount: counts.get(p.id)! })),
  };
}

export function billableQuantity(memberCount: number, singleMemberBilling = false) {
  return singleMemberBilling ? Math.min(memberCount, 1) : memberCount;
}

export function isBillingMemberIncluded(member: BillingMember, decision?: BillingDecision) {
  return !member.lockedExclusion && (decision?.include ?? !member.excludedByDefault);
}

export function isPersonalHyroxProgram(title: string) {
  return /^.+님\s*전용\s+하이록스\s+프로그램$/u.test(title.trim());
}

export function singleMemberProgramIds(
  programs: Pick<BillingProgram, "id" | "title">[],
  configuredIds: string[] = [],
) {
  return [...new Set([
    ...configuredIds,
    ...programs.filter((program) => isPersonalHyroxProgram(program.title)).map((program) => program.id),
  ])].sort();
}

export function buildBillingPreview(input: {
  month: string;
  day: number;
  contracts: BillingContract[];
  programs: BillingProgram[];
  access: BillingAccess[];
  names: Record<string, string>;
  staffIds: string[];
  programReviews: BillingProgramReview[];
  defaultUnitPrice?: number;
  excludedProgramIds?: string[];
  singleMemberProgramIds?: string[];
  memberExclusions?: BillingMemberExclusion[];
  preregistrationTerms?: BillingPreregistrationTerm[];
}): BillingPreview {
  const window = billingWindow(input.month, input.day);
  const excludedIds = new Set(input.excludedProgramIds ?? []);
  const singleMemberIds = new Set(singleMemberProgramIds(input.programs, input.singleMemberProgramIds));
  const programSelection = selectBillingPrograms(
    input.month,
    input.programs.filter((p) => !excludedIds.has(p.id)),
    input.programReviews,
  );
  const eligibleIds = new Set(programSelection.programs.map((p) => p.id));
  const staff = new Set(input.staffIds);
  const titles = new Map(input.programs.map((p) => [p.id, p.title]));
  const termsByMemberProgram = new Map<string, BillingPreregistrationTerm[]>();
  for (const term of input.preregistrationTerms ?? []) {
    if (!isMonth(term.first_month)) throw new Error("사전등록 첫 청구월을 확인해 주세요.");
    if (!term.user_id) continue; // Unmatched roster entries are never billable users.
    const key = `${term.user_id}:${term.program_id}`;
    termsByMemberProgram.set(key, [...(termsByMemberProgram.get(key) ?? []), term]);
  }
  const memberExclusions = (input.memberExclusions ?? []).filter((e) => e.is_active);
  const exclusionsByScope = new Map(memberExclusions.map((e) => [
    `${e.user_id}:${e.program_id ?? "tenant"}`, e,
  ]));
  // Explicit contracts take precedence even outside their billing schedule:
  // an ended/future contract must never fall back to automatic billing.
  const contractedIds = new Set(input.contracts.flatMap((c) => c.program_ids));
  const automatic: BillingContract[] = input.programs
    .filter((p) => eligibleIds.has(p.id) && !contractedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      title: p.title,
      program_ids: [p.id],
      unit_price: input.defaultUnitPrice ?? 7500,
      starts_on: p.start_date || window.periodStart,
      first_month: input.month,
      last_month: null,
      created_at: "",
    }));
  const automaticIds = new Set(automatic.map((c) => c.id));
  const lines = [...input.contracts, ...automatic]
    .filter(
      (c) =>
        c.first_month <= input.month &&
        (!c.last_month || c.last_month >= input.month) &&
        c.program_ids.some((id) => eligibleIds.has(id)),
    )
    .map((contract) => {
      const ids = new Set(contract.program_ids.filter((id) => eligibleIds.has(id)));
      const singleMemberBilling = contract.program_ids.some((id) => singleMemberIds.has(id));
      if (singleMemberBilling && contract.program_ids.length > 1) {
        throw new Error("1인 청구 프로그램은 다른 프로그램과 묶지 않고 단독 계약으로 관리해 주세요.");
      }
      const members = new Map<string, BillingMember>();
      const serviceStart = Date.parse(`${contract.starts_on}T00:00:00+09:00`);
      for (const access of input.access) {
        if (!ids.has(access.program_id)) continue;
        // An explicitly waived initial period must not return as a prior-month
        // late-join fee. Earlier, unrelated entitlements remain untouched.
        const accessStart = Date.parse(access.starts_at);
        const terms = termsByMemberProgram.get(`${access.user_id}:${access.program_id}`) ?? [];
        if (terms.some((term) => input.month < term.first_month
          && accessStart >= Date.parse(term.starts_at)
          && accessStart <= Date.parse(term.ends_at))) continue;
        const start = Math.max(Date.parse(access.starts_at), serviceStart);
        const end = Math.min(
          access.ends_at ? Date.parse(access.ends_at) : Infinity,
          access.closed_at ? Date.parse(access.closed_at) : Infinity,
        );
        // Half-open billing periods prevent midnight joins from being charged twice.
        if (start >= window.endTime || end <= Math.max(window.startTime, start))
          continue;
        const existing = members.get(access.user_id);
        const matchingExclusions = [
          exclusionsByScope.get(`${access.user_id}:tenant`),
          exclusionsByScope.get(`${access.user_id}:${access.program_id}`),
        ].filter((e): e is BillingMemberExclusion => Boolean(e));
        const persistentlyExcluded = matchingExclusions.length > 0;
        const excluded = staff.has(access.user_id) || persistentlyExcluded;
        const title = titles.get(access.program_id) ?? "삭제된 프로그램";
        const joinedOn = kstDate(new Date(start));
        if (existing) {
          existing.joinedOn =
            existing.joinedOn < joinedOn ? existing.joinedOn : joinedOn;
          if (!existing.programTitles.includes(title))
            existing.programTitles.push(title);
          // One confirmed period is enough to establish the full monthly fee.
          if (!excluded) {
            existing.needsReview = existing.excludedByDefault
              ? access.needs_review
              : existing.needsReview && access.needs_review;
          }
          existing.excludedByDefault = existing.excludedByDefault && excluded;
          existing.lockedExclusion = existing.lockedExclusion && persistentlyExcluded;
          if (!existing.programIds!.includes(access.program_id)) existing.programIds!.push(access.program_id);
          for (const exclusion of matchingExclusions) {
            if (!existing.persistentExclusions!.some((e) => e.id === exclusion.id))
              existing.persistentExclusions!.push(exclusion);
          }
        } else {
          members.set(access.user_id, {
            key: `${contract.id}:${access.user_id}`,
            userId: access.user_id,
            name: input.names[access.user_id] || "탈퇴 / 이름 미등록 회원",
            joinedOn,
            programTitles: [title],
            needsReview: !excluded && access.needs_review,
            excludedByDefault: excluded,
            programIds: [access.program_id],
            lockedExclusion: persistentlyExcluded,
            persistentExclusions: matchingExclusions,
          });
        }
      }
      const rows = [...members.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
      );
      return {
        contractId: contract.id,
        programIds: [...contract.program_ids],
        serviceStartsOn: contract.starts_on,
        source: automaticIds.has(contract.id) ? "program" as const : "contract" as const,
        singleMemberBilling,
        title: contract.title,
        unitPrice: contract.unit_price,
        installment: monthDistance(contract.first_month, input.month) + 1,
        totalInstallments: contract.last_month
          ? monthDistance(contract.first_month, contract.last_month) + 1
          : null,
        members: rows,
        amount:
          billableQuantity(rows.filter((m) => !m.excludedByDefault).length, singleMemberBilling) * contract.unit_price,
      };
    });
  return applyBillingDecisions({
    billingTiming: "advance",
    volumeDiscount: { minimumQuantity: 51, unitPrice: 6500, applied: false },
    billingDay: input.day,
    month: input.month,
    dueDate: window.dueDate,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    programSelection,
    excludedProgramIds: [...excludedIds].sort(),
    singleMemberProgramIds: [...singleMemberIds].sort(),
    memberExclusions,
    lines,
    quantity: lines.reduce(
      (n, l) => n + billableQuantity(l.members.filter((m) => !m.excludedByDefault).length, l.singleMemberBilling),
      0,
    ),
    total: lines.reduce((n, l) => n + l.amount, 0),
    reviewCount: lines.reduce(
      (n, l) =>
        n +
        l.members.filter((m) => m.needsReview && !m.excludedByDefault).length,
      0,
    ),
  }, []);
}

// Reconcile new members against immutable advance invoices. A known member
// (including one explicitly excluded) is never charged again for that period.
export function addLateJoinAdjustments(
  preview: BillingPreview,
  invoices: BillingInvoice[],
  input: Pick<Parameters<typeof buildBillingPreview>[0], "access" | "names" | "staffIds" | "memberExclusions" | "excludedProgramIds" | "preregistrationTerms">,
): BillingPreview {
  const previous = invoices.filter((invoice) => invoice.month < preview.month);
  const adjustments: BillingLine[] = [];
  for (const invoice of previous) {
    const snapshot = invoice.snapshot;
    if (snapshot.billingTiming !== "advance") continue;
    const sourceDecisions = new Map(snapshot.decisions.map((decision) => [decision.key, decision]));
    for (const source of snapshot.lines) {
      if (source.source === "adjustment" || !source.programIds?.length) continue;
      const known = new Set(source.members.map((member) => member.userId));
      let previouslyAdjustedQuantity = 0;
      for (const later of previous) {
        const decisions = new Map(later.snapshot.decisions.map((decision) => [decision.key, decision]));
        for (const line of later.snapshot.lines) {
          if (line.sourceInvoiceId === invoice.id && line.sourceLineId === source.contractId) {
            for (const member of line.members) known.add(member.userId);
            previouslyAdjustedQuantity += billableQuantity(line.members.filter((member) =>
              isBillingMemberIncluded(member, decisions.get(member.key)),
            ).length, line.singleMemberBilling);
          }
        }
      }
      const originalQuantity = billableQuantity(source.members.filter((member) =>
        isBillingMemberIncluded(member, sourceDecisions.get(member.key)),
      ).length, source.singleMemberBilling);
      if (source.singleMemberBilling && originalQuantity + previouslyAdjustedQuantity >= 1) continue;
      const programs = source.programIds.map((id) => ({
        id, title: snapshot.programSelection?.programs.find((program) => program.id === id)?.title ?? source.title,
        start_date: source.serviceStartsOn ?? snapshot.periodStart, end_date: "", mobile_visibility: "",
      }));
      const selectedIds = new Set(snapshot.programSelection?.programs.map((program) => program.id) ?? source.programIds);
      const rebuilt = buildBillingPreview({
        ...input,
        month: invoice.month, day: snapshot.billingDay ?? Number(snapshot.dueDate.slice(8)),
        contracts: [{ id: source.contractId, title: source.title, program_ids: source.programIds,
          unit_price: source.unitPrice, starts_on: source.serviceStartsOn ?? snapshot.periodStart,
          first_month: invoice.month, last_month: invoice.month, created_at: "" }],
        programs,
        programReviews: programs.filter((program) => selectedIds.has(program.id)).map((program) => ({
          program_id: program.id, created_at: `${invoice.month}-01T00:00:00+09:00`,
        })),
        singleMemberProgramIds: source.singleMemberBilling ? source.programIds : [],
      });
      const candidates = rebuilt.lines[0]?.members.filter((member) =>
        !known.has(member.userId) && !member.excludedByDefault,
      ) ?? [];
      if (!candidates.length) continue;
      const id = `late:${invoice.id}:${source.contractId}`;
      adjustments.push({
        ...source, contractId: id, source: "adjustment", sourceInvoiceId: invoice.id,
        sourceLineId: source.contractId, serviceMonth: invoice.month,
        members: candidates.map((member) => ({ ...member, key: `${id}:${member.userId}` })),
        amount: billableQuantity(candidates.length, source.singleMemberBilling) * source.unitPrice,
      });
    }
  }
  return applyBillingDecisions({ ...preview, lines: [...preview.lines, ...adjustments] }, []);
}

export function applyBillingDecisions(
  preview: BillingPreview,
  decisions: BillingDecision[],
  requireReviewed = false,
): BillingPreview {
  const all = new Set(
    preview.lines.flatMap((l) => l.members.map((m) => m.key)),
  );
  const byKey = new Map<string, BillingDecision>();
  for (const decision of decisions) {
    if (!all.has(decision.key) || byKey.has(decision.key))
      throw new Error(
        "참여 인원이 변경되었습니다. 새로고침 후 다시 확인해 주세요.",
      );
    if (
      typeof decision.include !== "boolean" ||
      (requireReviewed && !decision.reason.trim())
    )
      throw new Error("인원 조정 사유를 입력해 주세요.");
    byKey.set(decision.key, decision);
  }
  let quantity = 0;
  let regularQuantity = 0;
  let lateJoinQuantity = 0;
  let lateJoinAmount = 0;
  const counts = new Map<string, number>();
  let lines = preview.lines.map((line) => {
    let count = 0;
    for (const member of line.members) {
      const decision = byKey.get(member.key);
      if (member.lockedExclusion && decision?.include)
        throw new Error("저장된 청구 제외를 먼저 해제해 주세요. 이번 달 인원 조정으로 덮어쓸 수 없습니다.");
      if (
        requireReviewed &&
        member.needsReview &&
        !member.excludedByDefault &&
        !decision
      )
        throw new Error(
          "과거 이용 기간 확인이 필요한 회원의 포함/제외를 먼저 결정해 주세요.",
        );
      if (isBillingMemberIncluded(member, decision)) count++;
    }
    const chargedCount = billableQuantity(count, line.singleMemberBilling);
    counts.set(line.contractId, chargedCount);
    quantity += chargedCount;
    if (line.source === "adjustment") {
      lateJoinQuantity += chargedCount;
      lateJoinAmount += chargedCount * line.unitPrice;
    } else regularQuantity += chargedCount;
    return { ...line, amount: chargedCount * line.unitPrice };
  });
  const volumeDiscount = preview.volumeDiscount ? {
    ...preview.volumeDiscount,
    applied: regularQuantity >= preview.volumeDiscount.minimumQuantity,
  } : undefined;
  if (volumeDiscount) {
    lines = lines.map((line) => {
      // Prior-month adjustments keep the unit price frozen in their source
      // invoice. They neither trigger this month's tier nor get repriced.
      if (line.source === "adjustment") return line;
      const baseUnitPrice = line.baseUnitPrice ?? line.unitPrice;
      const unitPrice = volumeDiscount.applied
        ? Math.min(baseUnitPrice, volumeDiscount.unitPrice)
        : baseUnitPrice;
      return { ...line, baseUnitPrice, unitPrice, amount: counts.get(line.contractId)! * unitPrice };
    });
  }
  return {
    ...preview,
    lines,
    quantity,
    regularQuantity,
    lateJoinQuantity,
    lateJoinAmount,
    volumeDiscount,
    reviewCount: lines.reduce((sum, line) => sum + line.members.filter((member) =>
      member.needsReview && isBillingMemberIncluded(member, byKey.get(member.key)),
    ).length, 0),
    total: lines.reduce((n, l) => n + l.amount, 0),
  };
}
