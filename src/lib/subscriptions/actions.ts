"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubscriptionActionResult = {
  ok: boolean;
  message: string;
};

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, userId: null };
  }

  return { supabase, userId: user.id };
}

export async function cancelMySubscriptionAction(formData: FormData): Promise<SubscriptionActionResult> {
  const subscriptionId = String(formData.get("subscriptionId") ?? "").trim();
  if (!subscriptionId) {
    return { ok: false, message: "구독 식별값이 올바르지 않습니다." };
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("id, status, cancel_at_period_end")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; status: string; cancel_at_period_end: boolean }>();

  if (!subscription) {
    return { ok: false, message: "구독 정보를 찾을 수 없습니다." };
  }

  if (subscription.status === "canceled") {
    return { ok: false, message: "이미 해지된 구독입니다." };
  }

  if (subscription.cancel_at_period_end) {
    return { ok: true, message: "이미 해지 예약된 구독입니다." };
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", subscription.id)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/mypage/subscriptions");
  revalidatePath("/subscriptions");
  return { ok: true, message: "다음 결제일부터 해지되도록 예약되었습니다." };
}

export async function resumeMySubscriptionAction(formData: FormData): Promise<SubscriptionActionResult> {
  const subscriptionId = String(formData.get("subscriptionId") ?? "").trim();
  if (!subscriptionId) {
    return { ok: false, message: "구독 식별값이 올바르지 않습니다." };
  }

  const { supabase, userId } = await getAuthedUserId();
  if (!userId) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("id, status, cancel_at_period_end")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; status: string; cancel_at_period_end: boolean }>();

  if (!subscription) {
    return { ok: false, message: "구독 정보를 찾을 수 없습니다." };
  }

  if (subscription.status === "canceled") {
    return { ok: false, message: "해지 완료된 구독은 다시 시작할 수 없습니다." };
  }

  if (!subscription.cancel_at_period_end) {
    return { ok: true, message: "현재 유지 중인 구독입니다." };
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq("id", subscription.id)
    .eq("user_id", userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/mypage/subscriptions");
  revalidatePath("/subscriptions");
  return { ok: true, message: "구독 해지 예약이 취소되었습니다." };
}
