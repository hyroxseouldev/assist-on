"use server";

import { getTenantUserLoginPath } from "@/lib/auth/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

import { getTenantBookingCheckoutPath } from "./paths";

export type CreateBookingReservationResult = {
  ok: boolean;
  message?: string;
  loginPath?: string;
  payload?: {
    reservationId: string;
  };
};

function normalizePhoneNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

export async function createBookingReservationAction(params: {
  tenantSlug: string;
  serviceId: string;
  optionId: string;
  slotId: string;
  bookerName: string;
  bookerPhone: string;
  userMemo: string;
}): Promise<CreateBookingReservationResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const checkoutPath = `${getTenantBookingCheckoutPath(params.tenantSlug, params.serviceId)}?optionId=${encodeURIComponent(params.optionId)}&slotId=${encodeURIComponent(params.slotId)}`;

  if (!user) {
    return {
      ok: false,
      loginPath: getTenantUserLoginPath(params.tenantSlug, checkoutPath),
      message: "로그인 후 예약을 진행해 주세요.",
    };
  }

  const bookerName = params.bookerName.trim();
  const bookerPhone = normalizePhoneNumber(params.bookerPhone);
  const userMemo = params.userMemo.trim();

  if (!bookerName) {
    return { ok: false, message: "예약자 이름을 입력해 주세요." };
  }

  if (bookerPhone.length < 9 || bookerPhone.length > 12) {
    return { ok: false, message: "전화번호를 올바르게 입력해 주세요." };
  }

  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." };
  }

  const [{ data: service }, { data: option }, { data: slot }, { data: branding }] = await Promise.all([
    supabase
      .from("booking_services")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", params.serviceId)
      .eq("is_active", true)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("booking_service_options")
      .select("id, price_krw")
      .eq("booking_service_id", params.serviceId)
      .eq("id", params.optionId)
      .eq("is_enabled", true)
      .maybeSingle<{ id: string; price_krw: number }>(),
    supabase
      .from("booking_slots")
      .select("id, status, ends_at")
      .eq("tenant_id", tenant.id)
      .eq("booking_service_id", params.serviceId)
      .eq("id", params.slotId)
      .maybeSingle<{ id: string; status: "open" | "pending" | "booked" | "blocked" | "closed"; ends_at: string }>(),
    supabase
      .from("tenant_branding")
      .select("bank_name, bank_account_number, bank_account_holder")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
      }>(),
  ]);

  if (!service || !option || !slot) {
    return { ok: false, message: "선택한 예약 정보를 다시 확인해 주세요." };
  }

  if (Date.parse(slot.ends_at) < Date.now()) {
    return { ok: false, message: "이미 지난 예약 슬롯입니다. 다른 시간을 선택해 주세요." };
  }

  if (slot.status !== "open") {
    return { ok: false, message: "선택한 슬롯은 현재 예약할 수 없습니다." };
  }

  if (!branding?.bank_name?.trim() || !branding.bank_account_number?.trim() || !branding.bank_account_holder?.trim()) {
    return { ok: false, message: "입금 계좌 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요." };
  }

  const [{ data: confirmedReservation }, { data: existingReservation }] = await Promise.all([
    supabase
      .from("booking_reservations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slot_id", params.slotId)
      .eq("status", "confirmed")
      .limit(1)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("booking_reservations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slot_id", params.slotId)
      .eq("user_id", user.id)
      .in("status", ["requested", "confirmed"])
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ]);

  if (confirmedReservation) {
    return { ok: false, message: "이미 확정된 예약이 있는 슬롯입니다. 다른 시간을 선택해 주세요." };
  }

  if (existingReservation) {
    return { ok: false, message: "같은 슬롯에 이미 접수한 예약이 있습니다." };
  }

  const { data: inserted, error } = await supabase
    .from("booking_reservations")
    .insert({
      tenant_id: tenant.id,
      booking_service_id: params.serviceId,
      slot_id: params.slotId,
      user_id: user.id,
      booking_option_id: params.optionId,
      price_krw: option.price_krw,
      status: "requested",
      booker_name: bookerName,
      booker_phone: bookerPhone,
      user_memo: userMemo,
      admin_memo: "",
      pending_expires_at: null,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !inserted) {
    return { ok: false, message: error?.message ?? "예약 접수에 실패했습니다." };
  }

  return {
    ok: true,
    payload: {
      reservationId: inserted.id,
    },
  };
}
