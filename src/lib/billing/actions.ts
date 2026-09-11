"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin/server";
import type { ManagedUsersPage } from "@/lib/admin/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  applyBillingDecisions,
  billingWindow,
  isMonth,
  kstDate,
  singleMemberProgramIds,
} from "@/lib/billing/model";
import { getBillingData } from "@/lib/billing/server";

type Result = { ok: boolean; message: string };
export type BillingUserSearchPage = {
  items: { userId: string; name: string; email: string; phone: string | null }[];
  total: number;
  page: number;
  totalPages: number;
};
const monthSchema = z.string().refine(isMonth, "청구월을 확인해 주세요.");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(`${v}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v
    );
  }, "날짜를 확인해 주세요.");

async function writer(slug: string) {
  const context = await requireAdminUser(slug);
  if (!context.isPlatformAdmin)
    throw new Error(
      "플랫폼 관리자만 청구 설정과 입금 내역을 변경할 수 있습니다.",
    );
  return context;
}
function refresh(slug: string) {
  revalidatePath("/admin/billing");
  revalidatePath(`/t/${slug}/admin/billing`);
}
function failure(error: unknown): Result {
  return {
    ok: false,
    message:
      error instanceof z.ZodError
        ? error.issues[0].message
        : error instanceof Error
          ? error.message
          : "청구 처리에 실패했습니다.",
  };
}

export async function saveBillingSettings(
  slug: string,
  input: unknown,
): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z
      .object({
        billing_day: z.number().int().min(1).max(31),
        unit_price: z.number().int().min(0).max(10000000),
      })
      .parse(input);
    const { error } = await createSupabaseAdminClient()
      .from("billing_settings")
      .upsert({ tenant_id: context.tenant.id, ...values });
    if (error)
      throw new Error(
        error.code === "P0001"
          ? error.message
          : "청구 설정을 저장하지 못했습니다.",
      );
    refresh(slug);
    return {
      ok: true,
      message: "청구 설정을 저장했습니다. 기존 계약 단가는 변경되지 않습니다.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function searchBillingExclusionUsers(
  slug: string,
  input: unknown,
): Promise<{ ok: true; data: BillingUserSearchPage } | { ok: false; message: string }> {
  const context = await writer(slug);
  try {
    const values = z.object({
      query: z.string().trim().max(100),
      page: z.number().int().min(1).max(100000),
    }).parse(input);
    const { data, error } = await createSupabaseAdminClient().rpc("search_program_change_members", {
      p_tenant_id: context.tenant.id,
      p_actor_id: context.user.id,
      p_query: values.query,
      p_program_id: null,
      p_active_only: false,
      p_page: values.page,
      p_page_size: 10,
    });
    if (error || !data) {
      console.error("Failed to search billing exclusion users", { tenantId: context.tenant.id, error });
      throw new Error("회원 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
    const result = data as ManagedUsersPage;
    // Return only identity fields needed for selection, not workout/change history.
    return { ok: true, data: {
      items: result.items.map((member) => ({
        userId: member.id, name: member.full_name, email: member.email, phone: member.phone_number,
      })),
      total: result.total, page: result.page, totalPages: result.totalPages,
    } };
  } catch (error) {
    return { ok: false, message: failure(error).message };
  }
}

export async function saveBillingMemberExclusion(slug: string, input: unknown): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z.object({
      userId: z.string().uuid(),
      programId: z.string().uuid().nullable(),
      reason: z.string().trim().min(1, "제외 사유를 입력해 주세요.").max(300),
    }).parse(input);
    const db = createSupabaseAdminClient();
    // The DB guard validates tenant association atomically, including users who
    // only have a tenant profile and have not joined a billable program yet.
    if (values.programId) {
      const program = await db.from("programs").select("id")
        .eq("tenant_id", context.tenant.id).eq("id", values.programId).maybeSingle();
      if (program.error || !program.data) throw new Error("해당 고객사의 프로그램을 확인하지 못했습니다.");
    }
    const { error } = await db.from("billing_member_exclusions").upsert({
      tenant_id: context.tenant.id,
      user_id: values.userId,
      program_id: values.programId,
      reason: values.reason,
      is_active: true,
      updated_by: context.user.id,
    }, { onConflict: "tenant_id,user_id,scope_key" });
    if (error) throw new Error(error.code === "P0001" ? error.message : "청구 제외를 저장하지 못했습니다.");
    refresh(slug);
    return { ok: true, message: "청구 제외를 저장했습니다. 미확정 청구와 다음 달에도 적용됩니다." };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeBillingMemberExclusion(slug: string, input: unknown): Promise<Result> {
  const context = await writer(slug);
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(input);
    const { data, error } = await createSupabaseAdminClient().from("billing_member_exclusions")
      .update({ is_active: false, updated_by: context.user.id })
      .eq("tenant_id", context.tenant.id).eq("id", id).eq("is_active", true).select("id");
    if (error || !data?.length) throw new Error("제외 설정이 이미 해제되었거나 찾을 수 없습니다.");
    refresh(slug);
    return { ok: true, message: "제외 설정을 해제했습니다. 다른 제외 조건이 없다면 미확정 청구부터 다시 포함됩니다." };
  } catch (error) {
    return failure(error);
  }
}

export async function createBillingContract(
  slug: string,
  input: unknown,
): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z
      .object({
        title: z.string().trim().min(1).max(120),
        program_ids: z.array(z.string().uuid()).min(1).max(100),
        unit_price: z.number().int().min(0).max(10000000),
        starts_on: dateSchema,
        first_month: monthSchema,
        last_month: monthSchema.nullable(),
      })
      .parse(input);
    if (new Set(values.program_ids).size !== values.program_ids.length)
      throw new Error("프로그램이 중복 선택되었습니다.");
    if (values.last_month && values.last_month < values.first_month)
      throw new Error("마지막 청구월은 첫 청구월 이후여야 합니다.");
    const db = createSupabaseAdminClient();
    const seed = await db
      .from("billing_settings")
      .upsert(
        { tenant_id: context.tenant.id },
        { onConflict: "tenant_id", ignoreDuplicates: true },
      );
    if (seed.error) throw new Error("청구 설정을 준비하지 못했습니다.");
    const setting = await db
      .from("billing_settings")
      .select("billing_day,single_member_program_ids")
      .eq("tenant_id", context.tenant.id)
      .single();
    if (setting.error) throw new Error("청구일을 확인하지 못했습니다.");
    const programs = await db.from("programs").select("id,title")
      .eq("tenant_id", context.tenant.id).in("id", values.program_ids);
    if (programs.error || programs.data.length !== values.program_ids.length)
      throw new Error("연결할 프로그램을 확인하지 못했습니다.");
    const singleIds = new Set(singleMemberProgramIds(programs.data, setting.data.single_member_program_ids));
    if (values.program_ids.length > 1 && values.program_ids.some(
      (id) => singleIds.has(id),
    )) throw new Error("1인 청구 프로그램은 다른 프로그램과 묶지 않고 단독 계약으로 등록해 주세요.");
    if (
      values.starts_on >
      billingWindow(values.first_month, setting.data.billing_day).periodEnd
    )
      throw new Error(
        "이용 시작일이 첫 선불 청구의 이용 기간 안에 있어야 합니다. 첫 청구월을 확인해 주세요.",
      );
    const { error } = await db
      .from("billing_contracts")
      .insert({
        ...values,
        tenant_id: context.tenant.id,
        created_by: context.user.id,
      });
    if (error)
      throw new Error(
        error.code === "P0001" ? error.message : "계약을 등록하지 못했습니다.",
      );
    refresh(slug);
    return {
      ok: true,
      message:
        "계약을 등록했습니다. 청구서는 자동 확정되거나 발송되지 않습니다.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function finalizeBilling(
  slug: string,
  input: unknown,
): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z
      .object({
        month: monthSchema,
        revision: z.string().length(64),
        decisions: z
          .array(
            z.object({
              key: z.string().max(200),
              include: z.boolean(),
              reason: z.string().trim().min(1).max(300),
            }),
          )
          .max(20000),
      })
      .parse(input);
    const current = await getBillingData(slug, values.month);
    if (current.invoices.some((i) => i.month === values.month))
      throw new Error("이미 확정된 청구월입니다.");
    if (current.revision !== values.revision)
      throw new Error(
        "청구 대상 프로그램, 인원 또는 계약이 변경되었습니다. 새로고침 후 다시 확인해 주세요.",
      );
    if (current.preview.dueDate > kstDate())
      throw new Error("아직 집계 중입니다. 청구일 이후 확정해 주세요.");
    const snapshot = applyBillingDecisions(
      current.preview,
      values.decisions,
      true,
    );
    const db = createSupabaseAdminClient();
    // Automatic billing can be confirmed without ever creating a contract.
    // Persist default settings so subsequent billing-day changes are guarded.
    const seed = await db.from("billing_settings").upsert(
      { tenant_id: context.tenant.id, ...current.settings },
      { onConflict: "tenant_id", ignoreDuplicates: true },
    );
    if (seed.error) throw new Error("청구 설정을 준비하지 못했습니다.");
    const { error } = await db.rpc(
      "finalize_billing_invoice",
      {
        p_tenant_id: context.tenant.id,
        p_actor_id: context.user.id,
        p_month: values.month,
        p_snapshot: { ...snapshot, decisions: values.decisions },
      },
    );
    if (error)
      throw new Error(
        error.code === "23505"
          ? "이미 확정된 청구월입니다."
          : "청구서를 확정하지 못했습니다.",
      );
    refresh(slug);
    return {
      ok: true,
      message:
        "청구서를 확정했습니다. 명단과 금액이 보존됩니다. 메일은 발송하지 않았습니다.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function endBillingContract(
  slug: string,
  input: unknown,
): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z
      .object({ id: z.string().uuid(), lastMonth: monthSchema })
      .parse(input);
    const { data, error } = await createSupabaseAdminClient()
      .from("billing_contracts")
      .update({ last_month: values.lastMonth })
      .eq("id", values.id)
      .eq("tenant_id", context.tenant.id)
      .select("id");
    if (error || !data?.length)
      throw new Error(
        error?.code === "P0001"
          ? error.message
          : "종료월을 저장하지 못했습니다. 첫 청구월 이후인지 확인해 주세요.",
      );
    refresh(slug);
    return {
      ok: true,
      message: `${values.lastMonth} 청구를 마지막으로 계약을 종료합니다.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function markBillingPaid(
  slug: string,
  input: unknown,
): Promise<Result> {
  const context = await writer(slug);
  try {
    const values = z
      .object({
        id: z.string().uuid(),
        paidOn: dateSchema,
        note: z.string().trim().min(1).max(500),
      })
      .parse(input);
    if (values.paidOn > kstDate())
      throw new Error("미래 날짜로 입금 처리할 수 없습니다.");
    const db = createSupabaseAdminClient();
    const existing = await db
      .from("billing_invoices")
      .select("created_at")
      .eq("id", values.id)
      .eq("tenant_id", context.tenant.id)
      .single();
    if (existing.error) throw new Error("청구서를 찾을 수 없습니다.");
    if (values.paidOn < kstDate(new Date(existing.data.created_at)))
      throw new Error("청구 확정일 이후의 입금일을 선택해 주세요.");
    const { data, error } = await db
      .from("billing_invoices")
      .update({
        paid_at: `${values.paidOn}T12:00:00+09:00`,
        paid_by: context.user.id,
        payment_note: values.note,
      })
      .eq("id", values.id)
      .eq("tenant_id", context.tenant.id)
      .is("paid_at", null)
      .select("id");
    if (error || !data?.length)
      throw new Error("입금 확인에 실패했거나 이미 처리된 청구서입니다.");
    refresh(slug);
    return { ok: true, message: "전액 입금 확인을 기록했습니다." };
  } catch (error) {
    return failure(error);
  }
}
