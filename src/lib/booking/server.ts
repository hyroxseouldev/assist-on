import { getPublishedLegalDocumentByType, normalizeLegalContentHtml } from "@/lib/legal/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type PublicBookingServiceSummary = {
  id: string;
  name: string;
  description: string;
};

export type PublicBookingOption = {
  id: string;
  name: string;
  description: string;
  priceKrw: number;
  sortOrder: number;
};

export type PublicBookingSlot = {
  id: string;
  slotDate: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: 60 | 90;
  status: "open" | "pending" | "booked" | "blocked" | "closed";
};

export type PublicBookingServiceDetail = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
    description: string;
    pendingHoldMinutes: number;
  };
  options: PublicBookingOption[];
  slots: PublicBookingSlot[];
};

export type BookingCheckoutContext = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
    description: string;
  };
  option: PublicBookingOption;
  slot: PublicBookingSlot;
  bankAccount: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankDepositGuide: string;
  };
  legalContent: {
    electronicCommerceTitle: string;
    electronicCommerceHtml: string;
    privacyTitle: string;
    privacyHtml: string;
  };
};

export type BookingReservationSummary = {
  id: string;
  status: "requested" | "confirmed" | "rejected" | "canceled" | "completed" | "no_show" | "expired";
  createdAt: string;
  bookerName: string;
  bookerPhone: string;
  userMemo: string;
  priceKrw: number;
  serviceName: string;
  optionName: string;
  slotStartsAt: string;
  slotEndsAt: string;
  bankAccount: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    bankDepositGuide: string;
  };
};

type BookingServiceRow = {
  id: string;
  name: string;
  description: string | null;
  pending_hold_minutes: number | null;
};

function normalizeDescription(value: string | null) {
  return value?.trim() ?? "";
}

export async function getFeaturedBookingServiceByTenantSlug(tenantSlug: string): Promise<PublicBookingServiceSummary | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("booking_services")
    .select("id, name, description")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; name: string; description: string | null }>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: normalizeDescription(data.description),
  };
}

export async function getPublicBookingServiceDetail(params: {
  tenantSlug: string;
  serviceId: string;
}): Promise<PublicBookingServiceDetail | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data: service } = await supabase
    .from("booking_services")
    .select("id, name, description, pending_hold_minutes")
    .eq("tenant_id", tenant.id)
    .eq("id", params.serviceId)
    .eq("is_active", true)
    .maybeSingle<BookingServiceRow>();

  if (!service) {
    return null;
  }

  const now = new Date().toISOString();
  const [{ data: options }, { data: slots }] = await Promise.all([
    supabase
      .from("booking_service_options")
      .select("id, name, description, price_krw, sort_order")
      .eq("booking_service_id", service.id)
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Array<{ id: string; name: string; description: string; price_krw: number; sort_order: number }>>(),
    supabase
      .from("booking_slots")
      .select("id, slot_date, starts_at, ends_at, duration_minutes, status")
      .eq("tenant_id", tenant.id)
      .eq("booking_service_id", service.id)
      .eq("status", "open")
      .gte("ends_at", now)
      .order("starts_at", { ascending: true })
      .limit(90)
      .returns<
        Array<{
          id: string;
          slot_date: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: 60 | 90;
          status: PublicBookingSlot["status"];
        }>
      >(),
  ]);

  return {
    tenant,
    service: {
      id: service.id,
      name: service.name,
      description: normalizeDescription(service.description),
      pendingHoldMinutes: Number(service.pending_hold_minutes ?? 0),
    },
    options: (options ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      description: option.description,
      priceKrw: Number(option.price_krw),
      sortOrder: Number(option.sort_order),
    })),
    slots: (slots ?? []).map((slot) => ({
      id: slot.id,
      slotDate: slot.slot_date,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      durationMinutes: slot.duration_minutes,
      status: slot.status,
    })),
  };
}

export async function getBookingCheckoutContext(params: {
  tenantSlug: string;
  serviceId: string;
  optionId: string;
  slotId: string;
}): Promise<BookingCheckoutContext | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);

  if (!tenant) {
    return null;
  }

  const [{ data: service }, { data: option }, { data: slot }, { data: branding }, electronicCommerceDocument, privacyDocument] = await Promise.all([
    supabase
      .from("booking_services")
      .select("id, name, description")
      .eq("tenant_id", tenant.id)
      .eq("id", params.serviceId)
      .eq("is_active", true)
      .maybeSingle<{ id: string; name: string; description: string | null }>(),
    supabase
      .from("booking_service_options")
      .select("id, booking_service_id, name, description, price_krw, sort_order")
      .eq("id", params.optionId)
      .eq("booking_service_id", params.serviceId)
      .eq("is_enabled", true)
      .maybeSingle<{
        id: string;
        booking_service_id: string;
        name: string;
        description: string;
        price_krw: number;
        sort_order: number;
      }>(),
    supabase
      .from("booking_slots")
      .select("id, tenant_id, booking_service_id, slot_date, starts_at, ends_at, duration_minutes, status")
      .eq("id", params.slotId)
      .eq("tenant_id", tenant.id)
      .eq("booking_service_id", params.serviceId)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        booking_service_id: string;
        slot_date: string;
        starts_at: string;
        ends_at: string;
        duration_minutes: 60 | 90;
        status: PublicBookingSlot["status"];
      }>(),
    supabase
      .from("tenant_branding")
      .select("bank_name, bank_account_number, bank_account_holder, bank_deposit_guide")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
        bank_deposit_guide: string | null;
      }>(),
    getPublishedLegalDocumentByType(params.tenantSlug, "electronic_commerce_terms", "ko"),
    getPublishedLegalDocumentByType(params.tenantSlug, "privacy_policy", "ko"),
  ]);

  if (!service || !option || !slot) {
    return null;
  }

  if (Date.parse(slot.ends_at) < Date.now() || slot.status !== "open") {
    return null;
  }

  return {
    tenant,
    service: {
      id: service.id,
      name: service.name,
      description: normalizeDescription(service.description),
    },
    option: {
      id: option.id,
      name: option.name,
      description: option.description,
      priceKrw: Number(option.price_krw),
      sortOrder: Number(option.sort_order),
    },
    slot: {
      id: slot.id,
      slotDate: slot.slot_date,
      startsAt: slot.starts_at,
      endsAt: slot.ends_at,
      durationMinutes: slot.duration_minutes,
      status: slot.status,
    },
    bankAccount: {
      bankName: branding?.bank_name?.trim() ?? "",
      bankAccountNumber: branding?.bank_account_number?.trim() ?? "",
      bankAccountHolder: branding?.bank_account_holder?.trim() ?? "",
      bankDepositGuide: branding?.bank_deposit_guide?.trim() ?? "",
    },
    legalContent: {
      electronicCommerceTitle: electronicCommerceDocument?.title || "전자상거래 이용약관",
      electronicCommerceHtml: electronicCommerceDocument
        ? sanitizeSessionContent(normalizeLegalContentHtml(electronicCommerceDocument.content_html))
        : "",
      privacyTitle: privacyDocument?.title || "개인정보처리방침",
      privacyHtml: privacyDocument ? sanitizeSessionContent(normalizeLegalContentHtml(privacyDocument.content_html)) : "",
    },
  };
}

export async function getBookingReservationSummary(params: {
  tenantSlug: string;
  reservationId: string;
  userId: string;
}): Promise<BookingReservationSummary | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);

  if (!tenant) {
    return null;
  }

  const [{ data: reservation }, { data: branding }] = await Promise.all([
    supabase
      .from("booking_reservations")
      .select(
        "id, status, created_at, booker_name, booker_phone, user_memo, price_krw, service:booking_service_id(name), option:booking_option_id(name), slot:slot_id(starts_at, ends_at)"
      )
      .eq("tenant_id", tenant.id)
      .eq("id", params.reservationId)
      .eq("user_id", params.userId)
      .maybeSingle<{
        id: string;
        status: BookingReservationSummary["status"];
        created_at: string;
        booker_name: string;
        booker_phone: string;
        user_memo: string;
        price_krw: number;
        service: { name: string } | { name: string }[] | null;
        option: { name: string } | { name: string }[] | null;
        slot: { starts_at: string; ends_at: string } | { starts_at: string; ends_at: string }[] | null;
      }>(),
    supabase
      .from("tenant_branding")
      .select("bank_name, bank_account_number, bank_account_holder, bank_deposit_guide")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
        bank_deposit_guide: string | null;
      }>(),
  ]);

  if (!reservation) {
    return null;
  }

  const service = Array.isArray(reservation.service) ? reservation.service[0] : reservation.service;
  const option = Array.isArray(reservation.option) ? reservation.option[0] : reservation.option;
  const slot = Array.isArray(reservation.slot) ? reservation.slot[0] : reservation.slot;

  return {
    id: reservation.id,
    status: reservation.status,
    createdAt: reservation.created_at,
    bookerName: reservation.booker_name,
    bookerPhone: reservation.booker_phone,
    userMemo: reservation.user_memo,
    priceKrw: Number(reservation.price_krw),
    serviceName: service?.name ?? "예약 서비스",
    optionName: option?.name ?? "옵션",
    slotStartsAt: slot?.starts_at ?? reservation.created_at,
    slotEndsAt: slot?.ends_at ?? reservation.created_at,
    bankAccount: {
      bankName: branding?.bank_name?.trim() ?? "",
      bankAccountNumber: branding?.bank_account_number?.trim() ?? "",
      bankAccountHolder: branding?.bank_account_holder?.trim() ?? "",
      bankDepositGuide: branding?.bank_deposit_guide?.trim() ?? "",
    },
  };
}
