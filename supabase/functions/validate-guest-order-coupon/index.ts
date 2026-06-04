import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

type ValidateCouponRequest = {
  tenantId?: unknown;
  couponCode?: unknown;
  orderPayload?: unknown;
};

type GuestOrderCoupon = {
  id: string;
  code: string;
  discount_type: "amount" | "percent";
  discount_value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("GUEST_ORDER_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function assertEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCouponCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "") : "";
}

function getOriginalTotalAmountKrw(payload: Record<string, unknown>) {
  const totalAmount = Number(payload.totalAmountKrw);
  if (Number.isFinite(totalAmount) && totalAmount > 0) {
    return Math.floor(totalAmount);
  }

  const monthlyPrice = Number(payload.monthlyPriceKrw);
  const durationMonths = Number(payload.durationMonths);
  if (Number.isFinite(monthlyPrice) && Number.isFinite(durationMonths) && monthlyPrice > 0 && durationMonths > 0) {
    return Math.floor(monthlyPrice * durationMonths);
  }

  return 0;
}

function getDiscountAmountKrw(coupon: GuestOrderCoupon, originalAmountKrw: number) {
  if (coupon.discount_type === "percent") {
    return Math.min(originalAmountKrw, Math.floor((originalAmountKrw * coupon.discount_value) / 100));
  }

  return Math.min(originalAmountKrw, coupon.discount_value);
}

function isCouponUsable(coupon: GuestOrderCoupon, now: Date) {
  if (!coupon.is_active) {
    return false;
  }

  if (coupon.starts_at && Date.parse(coupon.starts_at) > now.getTime()) {
    return false;
  }

  if (coupon.ends_at && Date.parse(coupon.ends_at) <= now.getTime()) {
    return false;
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json(405, { ok: false, message: "Method not allowed" });
    }

    const body = (await req.json().catch(() => null)) as ValidateCouponRequest | null;
    if (!body || !isPlainRecord(body)) {
      return json(400, { ok: false, message: "요청 형식이 올바르지 않습니다." });
    }

    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    const couponCode = normalizeCouponCode(body.couponCode);
    const orderPayload = isPlainRecord(body.orderPayload) ? body.orderPayload : null;

    if (!tenantId || !isUuid(tenantId)) {
      return json(400, { ok: false, message: "테넌트 정보가 올바르지 않습니다." });
    }

    if (!couponCode || !/^[A-Z0-9_-]{2,40}$/.test(couponCode)) {
      return json(400, { ok: false, message: "할인 코드 형식이 올바르지 않습니다." });
    }

    if (!orderPayload) {
      return json(400, { ok: false, message: "주문 정보가 올바르지 않습니다." });
    }

    const originalTotalAmountKrw = getOriginalTotalAmountKrw(orderPayload);
    if (originalTotalAmountKrw <= 0) {
      return json(400, { ok: false, message: "쿠폰을 적용할 주문 금액을 확인할 수 없습니다." });
    }

    const supabase = createClient(assertEnv("SUPABASE_URL"), assertEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: coupon, error } = await supabase
      .from("guest_order_coupons")
      .select("id, code, discount_type, discount_value, is_active, starts_at, ends_at, usage_limit, used_count")
      .eq("tenant_id", tenantId)
      .eq("code", couponCode)
      .maybeSingle<GuestOrderCoupon>();

    if (error) {
      return json(500, { ok: false, message: error.message });
    }

    if (!coupon || !isCouponUsable(coupon, new Date())) {
      return json(400, { ok: false, message: "사용할 수 없는 할인 코드입니다." });
    }

    const discountAmountKrw = getDiscountAmountKrw(coupon, originalTotalAmountKrw);
    const totalAmountKrw = Math.max(0, originalTotalAmountKrw - discountAmountKrw);
    const discountLabel =
      coupon.discount_type === "percent" ? `${coupon.discount_value}% 할인` : `${coupon.discount_value.toLocaleString("ko-KR")}원 할인`;

    return json(200, {
      ok: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmountKrw,
        originalTotalAmountKrw,
        totalAmountKrw,
        message: `${coupon.code} · ${discountLabel}이 적용됩니다.`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(500, { ok: false, message });
  }
});
