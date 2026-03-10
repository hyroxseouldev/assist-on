"use server";

import { randomUUID } from "crypto";

import {
  getDurationPassOrderName,
  parseDurationPassMonths,
  type DurationPassMonths,
} from "@/lib/store/duration-options";
import { appUrl } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type CheckoutIntentResult = {
  ok: boolean;
  message?: string;
  loginPath?: string;
  payload?: {
    mode: "one_time" | "subscription";
    clientKey: string;
    amount?: number;
    orderId?: string;
    orderName?: string;
    customerKey?: string;
    customerName: string;
    customerEmail: string;
    successUrl: string;
    failUrl: string;
  };
};

export type BankTransferOrderResult = {
  ok: boolean;
  message?: string;
  loginPath?: string;
  payload?: {
    orderId: string;
  };
};

function normalizePhoneNumber(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function requireTossClientKey() {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
}

export async function createCheckoutIntentAction(params: {
  tenantSlug: string;
  productId: string;
  durationMonths?: number;
}): Promise<CheckoutIntentResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      loginPath: `/login?next=${encodeURIComponent(`/store/${params.tenantSlug}/${params.productId}${params.durationMonths ? `?duration=${params.durationMonths}` : ""}`)}`,
      message: "로그인 후 결제를 진행해 주세요.",
    };
  }

  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." };
  }

  const { data: product } = await supabase
    .from("program_products")
    .select("id, tenant_id, price_krw, sale_status, sale_type, program:program_id(id, title)")
    .eq("id", params.productId)
    .eq("tenant_id", tenant.id)
    .eq("sale_status", "active")
    .maybeSingle<{
      id: string;
      tenant_id: string;
      price_krw: number;
      sale_status: "active" | "preparing" | "private" | null;
      sale_type: "one_time" | "subscription" | null;
      program: { id: string; title: string } | null;
    }>();

  if (!product || !product.program) {
    return { ok: false, message: "판매 중인 프로그램이 아닙니다." };
  }

  const providerOrderId = `toss_${randomUUID()}`;
  const clientKey = requireTossClientKey();

  if (!clientKey) {
    return { ok: false, message: "결제 설정이 누락되었습니다. 관리자에게 문의해 주세요." };
  }

  const customerName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : user.email ?? "회원";

  const saleType = product.sale_type === "subscription" ? "subscription" : "one_time";
  const durationMonths = parseDurationPassMonths(params.durationMonths);
  const { data: durationOption } =
    saleType === "one_time" && durationMonths
      ? await supabase
          .from("program_product_duration_options")
          .select("duration_months, price_krw, is_enabled")
          .eq("product_id", product.id)
          .eq("duration_months", durationMonths)
          .maybeSingle<{ duration_months: DurationPassMonths; price_krw: number; is_enabled: boolean }>()
      : { data: null as { duration_months: DurationPassMonths; price_krw: number; is_enabled: boolean } | null };

  if (saleType === "one_time" && (!durationOption || !durationOption.is_enabled)) {
    return { ok: false, message: "선택한 기간권 옵션을 찾을 수 없습니다." };
  }

  const amountKrw = saleType === "one_time" ? durationOption!.price_krw : product.price_krw;
  const orderName =
    saleType === "one_time" && durationOption
      ? getDurationPassOrderName(product.program.title, durationOption.duration_months)
      : product.program.title;

  const { error } = await supabase.from("program_orders").insert({
    tenant_id: tenant.id,
    buyer_user_id: user.id,
    product_id: product.id,
    amount_krw: amountKrw,
    duration_months: saleType === "one_time" ? durationOption?.duration_months ?? null : null,
    status: "pending",
    provider: "toss",
    provider_order_id: providerOrderId,
    payment_method: saleType === "subscription" ? "toss_subscription" : "toss_card",
    buyer_name: customerName,
    buyer_email: user.email ?? "",
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    payload: {
      mode: saleType,
      clientKey,
      amount: saleType === "one_time" ? amountKrw : undefined,
      orderId: saleType === "one_time" ? providerOrderId : undefined,
      orderName: saleType === "one_time" ? orderName : undefined,
      customerKey: saleType === "subscription" ? user.id : undefined,
      customerName,
      customerEmail: user.email ?? "",
      successUrl:
        saleType === "subscription"
          ? `${appUrl}/store/${params.tenantSlug}/checkout/success?flow=subscription&orderId=${providerOrderId}&productId=${params.productId}`
          : `${appUrl}/store/${params.tenantSlug}/checkout/success?productId=${params.productId}${durationOption ? `&duration=${durationOption.duration_months}` : ""}`,
      failUrl:
        saleType === "subscription"
          ? `${appUrl}/store/${params.tenantSlug}/checkout/fail?flow=subscription&orderId=${providerOrderId}&productId=${params.productId}`
          : `${appUrl}/store/${params.tenantSlug}/checkout/fail?productId=${params.productId}${durationOption ? `&duration=${durationOption.duration_months}` : ""}`,
    },
  };
}

export async function createBankTransferOrderAction(params: {
  tenantSlug: string;
  productId: string;
  durationMonths: number;
  buyerName: string;
  buyerPhone: string;
  depositorName: string;
}): Promise<BankTransferOrderResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      loginPath: `/login?next=${encodeURIComponent(`/store/${params.tenantSlug}/${params.productId}/checkout?duration=${params.durationMonths}`)}`,
      message: "로그인 후 주문을 진행해 주세요.",
    };
  }

  const buyerName = params.buyerName.trim();
  const buyerPhone = normalizePhoneNumber(params.buyerPhone);
  const depositorName = params.depositorName.trim();
  const buyerEmail = user.email?.trim() ?? "";

  if (!buyerName) {
    return { ok: false, message: "구매자 이름을 입력해 주세요." };
  }

  if (!buyerEmail) {
    return { ok: false, message: "계정 이메일 정보를 확인할 수 없습니다." };
  }

  if (buyerPhone.length < 9 || buyerPhone.length > 12) {
    return { ok: false, message: "전화번호를 올바르게 입력해 주세요." };
  }

  if (!depositorName) {
    return { ok: false, message: "입금자명을 입력해 주세요." };
  }

  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." };
  }

  const [{ data: product }, { data: branding }] = await Promise.all([
    supabase
      .from("program_products")
      .select("id, tenant_id, price_krw, sale_status, sale_type, program:program_id(id, title)")
      .eq("id", params.productId)
      .eq("tenant_id", tenant.id)
      .eq("sale_status", "active")
      .maybeSingle<{
        id: string;
        tenant_id: string;
        price_krw: number;
        sale_status: "active" | "preparing" | "private" | null;
        sale_type: "one_time" | "subscription" | null;
        program: { id: string; title: string } | null;
      }>(),
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

  if (!product || !product.program) {
    return { ok: false, message: "판매 중인 프로그램이 아닙니다." };
  }

  if (product.sale_type === "subscription") {
    return { ok: false, message: "구독 상품은 아직 무통장 결제를 지원하지 않습니다." };
  }

  const durationMonths = parseDurationPassMonths(params.durationMonths);
  if (!durationMonths) {
    return { ok: false, message: "기간권 옵션을 선택해 주세요." };
  }

  const { data: durationOption } = await supabase
    .from("program_product_duration_options")
    .select("duration_months, price_krw, is_enabled")
    .eq("product_id", product.id)
    .eq("duration_months", durationMonths)
    .maybeSingle<{ duration_months: DurationPassMonths; price_krw: number; is_enabled: boolean }>();

  if (!durationOption || !durationOption.is_enabled) {
    return { ok: false, message: "선택한 기간권 옵션을 찾을 수 없습니다." };
  }

  const now = new Date().toISOString();
  const { data: existingEntitlement } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("program_id", product.program.id)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (existingEntitlement) {
    return { ok: false, message: "이미 이용 중인 프로그램입니다." };
  }

  if (!branding?.bank_name?.trim() || !branding.bank_account_number?.trim() || !branding.bank_account_holder?.trim()) {
    return { ok: false, message: "입금 계좌 정보가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요." };
  }

  const providerOrderId = `bank_${randomUUID()}`;
  const { error } = await supabase.from("program_orders").insert({
    tenant_id: tenant.id,
    buyer_user_id: user.id,
    product_id: product.id,
    amount_krw: durationOption.price_krw,
    duration_months: durationOption.duration_months,
    status: "pending",
    provider: "bank_transfer",
    provider_order_id: providerOrderId,
    payment_method: "bank_transfer",
    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: buyerPhone,
    depositor_name: depositorName,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    payload: {
      orderId: providerOrderId,
    },
  };
}
