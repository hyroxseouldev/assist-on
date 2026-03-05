"use server";

import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInvitationPreviewByToken } from "@/lib/invitations/server";

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/t/select");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const invitation = await getInvitationPreviewByToken(token);
  if (!invitation || invitation.isExpired || invitation.isExhausted) {
    redirect(`/invite/${token}?error=${encodeURIComponent("유효하지 않거나 만료된 초대 링크입니다.")}`);
  }

  const admin = createSupabaseAdminClient();
  const { data: existingMembership } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", invitation.tenantId)
    .eq("user_id", user.id)
    .maybeSingle<{ tenant_id: string }>();

  let changed = false;

  if (!existingMembership) {
    const { error: membershipError } = await admin.from("tenant_memberships").insert({
      tenant_id: invitation.tenantId,
      user_id: user.id,
      role: invitation.role,
    });

    if (membershipError) {
      redirect(`/invite/${token}?error=${encodeURIComponent("초대 수락 처리에 실패했습니다. 다시 시도해 주세요.")}`);
    }

    changed = true;
  }

  if (invitation.programId) {
    const { data: program } = await admin
      .from("programs")
      .select("id, end_date")
      .eq("tenant_id", invitation.tenantId)
      .eq("id", invitation.programId)
      .maybeSingle<{ id: string; end_date: string }>();

    if (!program) {
      redirect(`/invite/${token}?error=${encodeURIComponent("초대 대상 프로그램을 찾지 못했습니다.")}`);
    }

    const nowIso = new Date().toISOString();
    const { data: existingEntitlement } = await admin
      .from("program_entitlements")
      .select("id")
      .eq("tenant_id", invitation.tenantId)
      .eq("user_id", user.id)
      .eq("program_id", invitation.programId)
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .limit(1)
      .returns<Array<{ id: string }>>();

    if ((existingEntitlement ?? []).length === 0) {
      const endsAt = program.end_date ? new Date(`${program.end_date}T23:59:59+09:00`).toISOString() : null;

      const { error: entitlementError } = await admin.from("program_entitlements").insert({
        tenant_id: invitation.tenantId,
        user_id: user.id,
        program_id: invitation.programId,
        source_order_id: null,
        source_invitation_id: invitation.id,
        starts_at: nowIso,
        ends_at: endsAt,
        is_active: true,
      });

      if (entitlementError) {
        redirect(`/invite/${token}?error=${encodeURIComponent("프로그램 접근 권한 부여에 실패했습니다.")}`);
      }

      changed = true;
    }

    const { error: stateError } = await admin.from("user_program_states").upsert(
      {
        tenant_id: invitation.tenantId,
        user_id: user.id,
        active_program_id: invitation.programId,
      },
      { onConflict: "tenant_id,user_id" }
    );

    if (stateError) {
      redirect(`/invite/${token}?error=${encodeURIComponent("활성 프로그램 설정에 실패했습니다.")}`);
    }
  }

  if (changed) {
    const { error: counterError } = await admin
      .from("tenant_invitations")
      .update({ used_count: invitation.usedCount + 1 })
      .eq("id", invitation.id);

    if (counterError) {
      redirect(`/invite/${token}?error=${encodeURIComponent("초대 사용 횟수 갱신에 실패했습니다.")}`);
    }
  }

  redirect(`/t/${invitation.tenantSlug}`);
}
