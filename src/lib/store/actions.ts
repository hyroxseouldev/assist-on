"use server";

import { randomUUID } from "crypto";

import { appUrl } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type CheckoutIntentResult = {
  ok: boolean;
  message?: string;
  loginPath?: string;
  payload?: {
    clientKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerName: string;
    customerEmail: string;
    successUrl: string;
    failUrl: string;
  };
};

function requireTossClientKey() {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
}

export async function createCheckoutIntentAction(params: {
  tenantSlug: string;
  productId: string;
}): Promise<CheckoutIntentResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      loginPath: `/tenant/login?next=${encodeURIComponent(`/store/${params.tenantSlug}/${params.productId}`)}`,
      message: "로그인 후 결제를 진행해 주세요.",
    };
  }

  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." };
  }

  const { data: product } = await supabase
    .from("program_products")
    .select("id, tenant_id, price_krw, program:program_id(id, title)")
    .eq("id", params.productId)
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      price_krw: number;
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

  const { error } = await supabase.from("program_orders").insert({
    tenant_id: tenant.id,
    buyer_user_id: user.id,
    product_id: product.id,
    amount_krw: product.price_krw,
    status: "pending",
    provider: "toss",
    provider_order_id: providerOrderId,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const customerName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : user.email ?? "회원";

  return {
    ok: true,
    payload: {
      clientKey,
      amount: product.price_krw,
      orderId: providerOrderId,
      orderName: product.program.title,
      customerName,
      customerEmail: user.email ?? "",
      successUrl: `${appUrl}/store/${params.tenantSlug}/checkout/success`,
      failUrl: `${appUrl}/store/${params.tenantSlug}/checkout/fail`,
    },
  };
}
