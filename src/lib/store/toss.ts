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

type ConfirmSubscriptionStartParams = {
  tenantSlug: string;
  orderId: string;
  authKey: string;
  customerKey: string;
  userId: string;
};

type OrderRow = {
  id: string;
  tenant_id: string;
  buyer_user_id: string;
  product_id: string;
  amount_krw: number;
  status: string;
  provider_order_id: string;
};

type ProductRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  sale_type: "one_time" | "subscription" | null;
  billing_interval: "monthly" | null;
  program: { title?: string; end_date?: string } | null;
};

type TossConfirmResponse = {
  approvedAt?: string;
  paymentKey?: string;
  message?: string;
};

type TossBillingIssueResponse = {
  billingKey?: string;
  customerKey?: string;
  message?: string;
};

type TossBillingChargeResponse = {
  approvedAt?: string;
  paymentKey?: string;
  message?: string;
};

function getNextMonthlyRange(startIso: string) {
  const start = new Date(startIso);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  const nextBillingAt = new Date(end);
  nextBillingAt.setMilliseconds(nextBillingAt.getMilliseconds() + 1);

  return {
    cycleStartAt: start.toISOString(),
    cycleEndAt: end.toISOString(),
    nextBillingAt: nextBillingAt.toISOString(),
  };
}

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

async function getOrderByProviderOrderId(params: { tenantId: string; orderId: string; userId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("program_orders")
    .select("id, tenant_id, buyer_user_id, product_id, amount_krw, status, provider_order_id")
    .eq("tenant_id", params.tenantId)
    .eq("provider_order_id", params.orderId)
    .eq("buyer_user_id", params.userId)
    .maybeSingle<OrderRow>();

  return data;
}

async function getProductByOrder(order: OrderRow) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("program_products")
    .select("id, tenant_id, program_id, price_krw, sale_type, billing_interval, program:program_id(title, end_date)")
    .eq("id", order.product_id)
    .maybeSingle<ProductRow>();

  return data;
}

async function finalizePaidOrder(params: {
  order: OrderRow;
  paymentKey: string | null;
  approvedAt: string;
  rawConfirm: unknown;
  billingKey?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const product = await getProductByOrder(params.order);

  if (!product) {
    return { ok: false, message: "상품 정보를 찾을 수 없습니다." } as const;
  }

  const saleType = product.sale_type === "subscription" ? "subscription" : "one_time";
  const cycleRange = getNextMonthlyRange(params.approvedAt);
  const endsAt =
    saleType === "subscription"
      ? cycleRange.cycleEndAt
      : product.program?.end_date
      ? new Date(`${product.program.end_date}T23:59:59+09:00`).toISOString()
      : null;

  const { error: orderUpdateError } = await supabase
    .from("program_orders")
    .update({
      status: "paid",
      payment_key: params.paymentKey,
      raw_confirm: params.rawConfirm,
      paid_at: params.approvedAt,
      fail_reason: null,
    })
    .eq("id", params.order.id);

  if (orderUpdateError) {
    return { ok: false, message: orderUpdateError.message } as const;
  }

  const { data: existingEntitlementByOrder } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("source_order_id", params.order.id)
    .maybeSingle<{ id: string }>();

  if (!existingEntitlementByOrder) {
    const nowIso = new Date().toISOString();
    const { data: existingActiveEntitlement } = await supabase
      .from("program_entitlements")
      .select("id, ends_at")
      .eq("tenant_id", params.order.tenant_id)
      .eq("user_id", params.order.buyer_user_id)
      .eq("program_id", product.program_id)
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; ends_at: string | null }>();

    if (existingActiveEntitlement) {
      const nextEndsAt =
        !endsAt || !existingActiveEntitlement.ends_at
          ? existingActiveEntitlement.ends_at ?? endsAt
          : new Date(existingActiveEntitlement.ends_at) > new Date(endsAt)
          ? existingActiveEntitlement.ends_at
          : endsAt;

      const { error: entitlementUpdateError } = await supabase
        .from("program_entitlements")
        .update({
          ends_at: nextEndsAt,
          is_active: true,
        })
        .eq("id", existingActiveEntitlement.id);

      if (entitlementUpdateError) {
        return { ok: false, message: entitlementUpdateError.message } as const;
      }
    } else {
      const { error: entitlementError } = await supabase.from("program_entitlements").insert({
        tenant_id: params.order.tenant_id,
        user_id: params.order.buyer_user_id,
        program_id: product.program_id,
        source_order_id: params.order.id,
        starts_at: new Date().toISOString(),
        ends_at: endsAt,
        is_active: true,
      });

      if (entitlementError) {
        return { ok: false, message: entitlementError.message } as const;
      }
    }
  }

  if (saleType === "subscription") {
    const { data: existingSubscription } = await supabase
      .from("user_subscriptions")
      .select("id, billing_key")
      .eq("tenant_id", params.order.tenant_id)
      .eq("user_id", params.order.buyer_user_id)
      .eq("product_id", product.id)
      .in("status", ["incomplete", "active", "past_due", "canceled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; billing_key: string | null }>();

    const subscriptionPayload = {
      status: "active",
      cancel_at_period_end: false,
      canceled_at: null,
      current_period_start_at: cycleRange.cycleStartAt,
      current_period_end_at: cycleRange.cycleEndAt,
      next_billing_at: cycleRange.nextBillingAt,
      last_paid_at: params.approvedAt,
      last_failed_at: null,
      billing_key: params.billingKey ?? existingSubscription?.billing_key ?? null,
    };

    let subscriptionId = existingSubscription?.id ?? null;

    if (subscriptionId) {
      const { error: subscriptionUpdateError } = await supabase
        .from("user_subscriptions")
        .update(subscriptionPayload)
        .eq("id", subscriptionId);

      if (subscriptionUpdateError) {
        return { ok: false, message: subscriptionUpdateError.message } as const;
      }
    } else {
      const { data: createdSubscription, error: subscriptionInsertError } = await supabase
        .from("user_subscriptions")
        .insert({
          tenant_id: params.order.tenant_id,
          user_id: params.order.buyer_user_id,
          product_id: product.id,
          provider: "toss",
          ...subscriptionPayload,
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (subscriptionInsertError) {
        return { ok: false, message: subscriptionInsertError.message } as const;
      }

      subscriptionId = createdSubscription?.id ?? null;
    }

    if (subscriptionId) {
      const { data: latestCycle } = await supabase
        .from("subscription_cycles")
        .select("cycle_index")
        .eq("subscription_id", subscriptionId)
        .order("cycle_index", { ascending: false })
        .limit(1)
        .maybeSingle<{ cycle_index: number }>();

      const cycleIndex = (latestCycle?.cycle_index ?? 0) + 1;
      const { error: cycleInsertError } = await supabase.from("subscription_cycles").insert({
        subscription_id: subscriptionId,
        cycle_index: cycleIndex,
        cycle_start_at: cycleRange.cycleStartAt,
        cycle_end_at: cycleRange.cycleEndAt,
        amount_krw: product.price_krw,
        status: "paid",
        provider_order_id: params.order.provider_order_id,
        provider_payment_key: params.paymentKey,
        paid_at: params.approvedAt,
      });

      if (cycleInsertError) {
        return { ok: false, message: cycleInsertError.message } as const;
      }
    }
  }

  await supabase.from("tenant_memberships").upsert(
    {
      tenant_id: params.order.tenant_id,
      user_id: params.order.buyer_user_id,
      role: "member",
    },
    {
      onConflict: "tenant_id,user_id",
      ignoreDuplicates: true,
    }
  );

  await supabase.from("user_program_states").upsert(
    {
      tenant_id: params.order.tenant_id,
      user_id: params.order.buyer_user_id,
      active_program_id: product.program_id,
    },
    { onConflict: "tenant_id,user_id" }
  );

  return {
    ok: true,
    message: saleType === "subscription" ? "구독 시작 및 첫 결제가 완료되었습니다." : "결제가 완료되었습니다.",
  } as const;
}

export async function confirmTossPayment(params: ConfirmPaymentParams) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." } as const;
  }

  const order = await getOrderByProviderOrderId({ tenantId: tenant.id, orderId: params.orderId, userId: params.userId });

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

  const result = (await response.json()) as TossConfirmResponse;

  if (!response.ok) {
    await supabase
      .from("program_orders")
      .update({ status: "failed", fail_reason: result.message ?? "결제 승인 실패" })
      .eq("id", order.id);

    return { ok: false, message: result.message ?? "결제 승인에 실패했습니다." } as const;
  }

  const approvedAt = result.approvedAt ? new Date(result.approvedAt).toISOString() : new Date().toISOString();

  return finalizePaidOrder({
    order,
    paymentKey: params.paymentKey,
    approvedAt,
    rawConfirm: result,
    billingKey: null,
  });
}

export async function confirmTossSubscriptionStart(params: ConfirmSubscriptionStartParams) {
  if (params.customerKey !== params.userId) {
    return { ok: false, message: "구독 인증 정보가 올바르지 않습니다." } as const;
  }

  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." } as const;
  }

  const order = await getOrderByProviderOrderId({ tenantId: tenant.id, orderId: params.orderId, userId: params.userId });
  if (!order) {
    return { ok: false, message: "주문 정보를 찾을 수 없습니다." } as const;
  }

  if (order.status === "paid") {
    return { ok: true, message: "이미 구독이 시작되었습니다." } as const;
  }

  const product = await getProductByOrder(order);
  if (!product || product.sale_type !== "subscription") {
    return { ok: false, message: "구독 상품을 찾을 수 없습니다." } as const;
  }

  const secretKey = getTossSecretKey();

  const billingIssueResponse = await fetch(`https://api.tosspayments.com/v1/billing/authorizations/${params.authKey}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey: params.customerKey,
    }),
  });

  const billingIssueResult = (await billingIssueResponse.json()) as TossBillingIssueResponse;
  if (!billingIssueResponse.ok || !billingIssueResult.billingKey) {
    await supabase
      .from("program_orders")
      .update({ status: "failed", fail_reason: billingIssueResult.message ?? "빌링키 발급 실패" })
      .eq("id", order.id);

    return { ok: false, message: billingIssueResult.message ?? "빌링키 발급에 실패했습니다." } as const;
  }

  const billingChargeResponse = await fetch(`https://api.tosspayments.com/v1/billing/${billingIssueResult.billingKey}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: order.amount_krw,
      orderId: order.provider_order_id,
      orderName: product.program?.title ?? "월 구독",
    }),
  });

  const billingChargeResult = (await billingChargeResponse.json()) as TossBillingChargeResponse;
  if (!billingChargeResponse.ok) {
    await supabase
      .from("program_orders")
      .update({ status: "failed", fail_reason: billingChargeResult.message ?? "첫 결제 실패" })
      .eq("id", order.id);

    return { ok: false, message: billingChargeResult.message ?? "첫 결제 승인에 실패했습니다." } as const;
  }

  const approvedAt = billingChargeResult.approvedAt
    ? new Date(billingChargeResult.approvedAt).toISOString()
    : new Date().toISOString();

  return finalizePaidOrder({
    order,
    paymentKey: billingChargeResult.paymentKey ?? null,
    approvedAt,
    rawConfirm: {
      billingIssue: billingIssueResult,
      billingCharge: billingChargeResult,
    },
    billingKey: billingIssueResult.billingKey,
  });
}
