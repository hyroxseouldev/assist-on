import "server-only";

import { createHash } from "node:crypto";

import { requireAdminUser } from "@/lib/admin/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  billingWindow,
  billableQuantity,
  billingReviewWindow,
  buildBillingPreview,
  addLateJoinAdjustments,
  isMonth,
  kstDate,
} from "@/lib/billing/model";
import type {
  BillingAccess,
  BillingContract,
  BillingInvoice,
  BillingProgram,
  BillingProgramReview,
  BillingSettings,
  BillingMemberExclusion,
  BillingPreregistrationTerm,
} from "@/lib/billing/model";

async function getProgramReviews(
  db: ReturnType<typeof createSupabaseAdminClient>,
  tenantId: string,
  month: string,
) {
  const window = billingReviewWindow(month);
  const reviews: BillingProgramReview[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("program_session_reviews")
      .select("program_id,created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", window.start)
      .lt("created_at", window.end)
      .order("created_at")
      .order("id")
      .range(offset, offset + 499)
      .returns<BillingProgramReview[]>();
    if (result.error)
      throw new Error("청구 대상 선정을 위한 월별 후기를 불러오지 못했습니다.");
    reviews.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return reviews;
}

export async function getBillingData(tenantSlug: string, month: string) {
  const context = await requireAdminUser(tenantSlug);
  if (!isMonth(month)) throw new Error("올바른 청구월을 선택해 주세요.");
  const db = createSupabaseAdminClient();
  const tenantId = context.tenant.id;
  const [settingResult, contractResult, programResult, invoiceResult, programReviews, memberExclusions, preregistrationTerms] =
    await Promise.all([
      db
        .from("billing_settings")
        .select("billing_day,unit_price,excluded_program_ids,single_member_program_ids")
        .eq("tenant_id", tenantId)
        .maybeSingle<BillingSettings>(),
      db
        .from("billing_contracts")
        .select(
          "id,title,program_ids,unit_price,starts_on,first_month,last_month,created_at",
        )
        .eq("tenant_id", tenantId)
        .order("created_at")
        .returns<BillingContract[]>(),
      db
        .from("programs")
        .select("id,title,start_date,end_date,mobile_visibility")
        .eq("tenant_id", tenantId)
        .order("display_order")
        .returns<BillingProgram[]>(),
      db
        .from("billing_invoices")
        .select("id,month,amount,created_at,paid_at,payment_note,snapshot")
        .eq("tenant_id", tenantId)
        .order("month", { ascending: false })
        .returns<BillingInvoice[]>(),
      getProgramReviews(db, tenantId, month),
      getMemberExclusions(db, tenantId),
      getPreregistrationTerms(db, tenantId),
    ]);
  for (const result of [
    settingResult,
    contractResult,
    programResult,
    invoiceResult,
  ]) {
    if (result.error) {
      console.error("Billing data query failed", {
        tenantId,
        code: result.error.code,
      });
      throw new Error(
        "청구 데이터를 불러오지 못했습니다. DB 마이그레이션과 접근 권한을 확인해 주세요.",
      );
    }
  }
  const settings = settingResult.data ?? {
    billing_day: 18, unit_price: 7500, excluded_program_ids: [], single_member_program_ids: [],
  };
  const window = billingWindow(month, settings.billing_day);
  // Include prior advance periods to reconcile members who joined after an
  // invoice was finalized. Previously invoiced adjustments are deduplicated.
  const accessStart = Math.min(window.startTime, ...(invoiceResult.data ?? [])
    .filter((invoice) => invoice.month < month && invoice.snapshot.billingTiming === "advance")
    .map((invoice) => Date.parse(`${invoice.snapshot.periodStart}T00:00:00+09:00`)));
  const access: BillingAccess[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("billing_access_periods")
      .select("id,user_id,program_id,starts_at,ends_at,closed_at,needs_review")
      .eq("tenant_id", tenantId)
      .lt("starts_at", new Date(window.endTime).toISOString())
      .or(
        `ends_at.is.null,ends_at.gt.${new Date(accessStart).toISOString()}`,
      )
      .order("id")
      .range(offset, offset + 499)
      .returns<BillingAccess[]>();
    if (result.error)
      throw new Error("참여자 이용 이력을 불러오지 못했습니다.");
    access.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  const userIds = [...new Set([...access.map((a) => a.user_id), ...memberExclusions.map((e) => e.user_id)])];
  const names: Record<string, string> = {};
  const staffIds: string[] = [];
  for (let offset = 0; offset < userIds.length; offset += 200) {
    const ids = userIds.slice(offset, offset + 200);
    const [profiles, tenantProfiles, memberships] = await Promise.all([
      db.from("profiles").select("id,full_name,platform_role").in("id", ids),
      db
        .from("tenant_user_profiles")
        .select("user_id,display_name")
        .eq("tenant_id", tenantId)
        .in("user_id", ids),
      db
        .from("tenant_memberships")
        .select("user_id,role")
        .eq("tenant_id", tenantId)
        .in("user_id", ids),
    ]);
    if (profiles.error || tenantProfiles.error || memberships.error)
      throw new Error("청구 대상 회원 정보를 불러오지 못했습니다.");
    for (const p of profiles.data ?? []) {
      if (p.full_name) names[p.id] = p.full_name;
      if (p.platform_role === "admin") staffIds.push(p.id);
    }
    for (const p of tenantProfiles.data ?? [])
      if (p.display_name) names[p.user_id] = p.display_name;
    for (const m of memberships.data ?? [])
      if (m.role !== "member") staffIds.push(m.user_id);
  }
  const contracts = contractResult.data ?? [];
  const programs = programResult.data ?? [];
  const regularPreview = buildBillingPreview({
    month,
    day: settings.billing_day,
    contracts,
    programs,
    access,
    names,
    staffIds,
    programReviews,
    defaultUnitPrice: settings.unit_price,
    excludedProgramIds: settings.excluded_program_ids,
    singleMemberProgramIds: settings.single_member_program_ids,
    memberExclusions,
    preregistrationTerms,
  });
  const preview = addLateJoinAdjustments(regularPreview, invoiceResult.data ?? [], {
    access, names, staffIds, memberExclusions, preregistrationTerms, excludedProgramIds: settings.excluded_program_ids,
  });
  // A stale confirmation is rejected if participants, price, or dates changed.
  const revision = createHash("sha256")
    .update(JSON.stringify(preview))
    .digest("hex");
  const linkedIds = new Set(contracts.flatMap((c) => c.program_ids));
  const selectedPrograms = preview.programSelection!.programs;
  const eligibleIds = new Set(selectedPrograms.map((p) => p.id));
  const unlinked = programs.filter((p) => !linkedIds.has(p.id) && eligibleIds.has(p.id));
  const suggestions = unlinked.map((p) => {
    const line = preview.lines.find((line) => line.source === "program" && line.contractId === p.id)!;
    return {
      programId: p.id,
      count: billableQuantity(line.members.filter((member) => !member.excludedByDefault).length, line.singleMemberBilling),
      amount: line.amount,
      reviewCount: selectedPrograms.find((program) => program.id === p.id)!.reviewCount,
    };
  });
  return {
    tenantSlug,
    tenantName: context.tenant.name,
    canManage: context.isPlatformAdmin,
    settings,
    contracts,
    programs,
    invoices: invoiceResult.data ?? [],
    preview,
    revision,
    today: kstDate(),
    suggestions,
    memberExclusions: memberExclusions.map((e) => ({
      ...e,
      userName: names[e.user_id] || "탈퇴 / 이름 미등록 회원",
      programTitle: e.program_id ? programs.find((p) => p.id === e.program_id)?.title ?? "삭제된 프로그램" : "고객사 전체",
    })),
  };
}

export type BillingPageData = Awaited<ReturnType<typeof getBillingData>>;

async function getPreregistrationTerms(db: ReturnType<typeof createSupabaseAdminClient>, tenantId: string) {
  const terms: BillingPreregistrationTerm[] = [];
  type Row = {
    first_month: string;
    entitlement_auto_grants: { matched_user_id: string | null; program_id: string; starts_at: string; ends_at: string };
  };
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("billing_preregistration_terms")
      .select("first_month,entitlement_auto_grants!inner(matched_user_id,program_id,starts_at,ends_at)")
      .eq("entitlement_auto_grants.tenant_id", tenantId)
      .order("grant_id").range(offset, offset + 499).returns<Row[]>();
    if (error) throw new Error("사전등록 첫 청구월 설정을 불러오지 못했습니다.");
    for (const row of data ?? []) {
      const grant = row.entitlement_auto_grants;
      terms.push({ user_id: grant.matched_user_id, program_id: grant.program_id,
        starts_at: grant.starts_at, ends_at: grant.ends_at, first_month: row.first_month });
    }
    if ((data?.length ?? 0) < 500) break;
  }
  return terms;
}

async function getMemberExclusions(db: ReturnType<typeof createSupabaseAdminClient>, tenantId: string) {
  const exclusions: BillingMemberExclusion[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("billing_member_exclusions")
      .select("id,user_id,program_id,reason,is_active,updated_at")
      .eq("tenant_id", tenantId).eq("is_active", true)
      .order("id").range(offset, offset + 499).returns<BillingMemberExclusion[]>();
    if (error) throw new Error("저장된 청구 제외 설정을 불러오지 못했습니다.");
    exclusions.push(...(data ?? []));
    if ((data?.length ?? 0) < 500) break;
  }
  return exclusions;
}
