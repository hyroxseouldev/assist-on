import { Buffer } from "buffer";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

type ConfirmPaymentParams = {
  tenantSlug: string;
  paymentKey: string;
  orderId: string;
  amount: number;
  userId: string;
};

type TossConfirmResponse = {
  approvedAt?: string;
  paymentKey?: string;
};

function getTossSecretKey() {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) {
    throw new Error("TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }
  return key;
}

function getAuthHeader(secretKey: string) {
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
}

export async function confirmTossPayment(params: ConfirmPaymentParams) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." } as const;
  }

  const { data: order } = await supabase
    .from("program_orders")
    .select("id, tenant_id, buyer_user_id, product_id, amount_krw, status, provider_order_id")
    .eq("tenant_id", tenant.id)
    .eq("provider_order_id", params.orderId)
    .eq("buyer_user_id", params.userId)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      buyer_user_id: string;
      product_id: string;
      amount_krw: number;
      status: string;
      provider_order_id: string;
    }>();

  if (!order) {
    return { ok: false, message: "주문 정보를 찾을 수 없습니다." } as const;
  }

  if (order.status === "paid") {
    return { ok: true, message: "이미 결제가 완료되었습니다." } as const;
  }

  if (order.amount_krw !== params.amount) {
    return { ok: false, message: "결제 금액 검증에 실패했습니다." } as const;
  }

  const secretKey = getTossSecretKey();
  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  const result = (await response.json()) as TossConfirmResponse & { message?: string };

  if (!response.ok) {
    await supabase
      .from("program_orders")
      .update({ status: "failed", fail_reason: result.message ?? "결제 승인 실패" })
      .eq("id", order.id);

    return { ok: false, message: result.message ?? "결제 승인에 실패했습니다." } as const;
  }

  const approvedAt = result.approvedAt ? new Date(result.approvedAt).toISOString() : new Date().toISOString();

  const { data: product } = await supabase
    .from("program_products")
    .select("program_id, program:program_id(end_date)")
    .eq("id", order.product_id)
    .maybeSingle<{
      program_id: string;
      program: { end_date: string } | null;
    }>();

  if (!product) {
    return { ok: false, message: "상품 정보를 찾을 수 없습니다." } as const;
  }

  const endsAt = product.program?.end_date ? new Date(`${product.program.end_date}T23:59:59+09:00`).toISOString() : null;

  const { error: orderUpdateError } = await supabase
    .from("program_orders")
    .update({
      status: "paid",
      payment_key: params.paymentKey,
      raw_confirm: result,
      paid_at: approvedAt,
      fail_reason: null,
    })
    .eq("id", order.id);

  if (orderUpdateError) {
    return { ok: false, message: orderUpdateError.message } as const;
  }

  const { data: existingEntitlement } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("source_order_id", order.id)
    .maybeSingle<{ id: string }>();

  if (!existingEntitlement) {
    const { error: entitlementError } = await supabase.from("program_entitlements").insert({
      tenant_id: order.tenant_id,
      user_id: order.buyer_user_id,
      program_id: product.program_id,
      source_order_id: order.id,
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
      is_active: true,
    });

    if (entitlementError) {
      return { ok: false, message: entitlementError.message } as const;
    }
  }

  await supabase.from("tenant_memberships").upsert(
    {
      tenant_id: order.tenant_id,
      user_id: order.buyer_user_id,
      role: "member",
    },
    {
      onConflict: "tenant_id,user_id",
      ignoreDuplicates: true,
    }
  );

  await supabase.from("user_program_states").upsert(
    {
      tenant_id: order.tenant_id,
      user_id: order.buyer_user_id,
      active_program_id: product.program_id,
    },
    { onConflict: "tenant_id,user_id" }
  );

  return { ok: true, message: "결제가 완료되었습니다." } as const;
}
