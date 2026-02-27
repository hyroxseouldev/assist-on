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

  if (!existingMembership) {
    const { error: membershipError } = await admin.from("tenant_memberships").insert({
      tenant_id: invitation.tenantId,
      user_id: user.id,
      role: invitation.role,
    });

    if (membershipError) {
      redirect(`/invite/${token}?error=${encodeURIComponent("초대 수락 처리에 실패했습니다. 다시 시도해 주세요.")}`);
    }

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
