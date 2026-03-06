// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

type SubscriptionRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  product_id: string;
  status: "incomplete" | "active" | "past_due" | "canceled";
  billing_key: string | null;
  cancel_at_period_end: boolean;
  current_period_start_at: string | null;
  current_period_end_at: string | null;
  next_billing_at: string | null;
  product: {
    id: string;
    price_krw: number;
    sale_type: "one_time" | "subscription" | null;
    billing_interval: "monthly" | null;
    subscription_grace_days: number;
    program_id: string;
  } | null;
};

type TossChargeSuccess = {
  paymentKey: string;
  approvedAt?: string;
};

type TossChargeFailure = {
  message?: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function assertEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function isAuthorized(req: Request) {
  const secret = Deno.env.get("SUBSCRIPTION_CRON_SECRET");
  if (!secret) {
    return true;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const headerSecret = req.headers.get("x-cron-secret");

  return bearer === secret || headerSecret === secret;
}

function addMonthlyRange(startAtIso: string) {
  const cycleStart = new Date(startAtIso);
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setMilliseconds(cycleEnd.getMilliseconds() - 1);

  const nextBilling = new Date(cycleEnd);
  nextBilling.setMilliseconds(nextBilling.getMilliseconds() + 1);

  return {
    cycleStartAt: cycleStart.toISOString(),
    cycleEndAt: cycleEnd.toISOString(),
    nextBillingAt: nextBilling.toISOString(),
  };
}

function createProviderOrderId(subscriptionId: string) {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `sub_${subscriptionId.slice(0, 8)}_${Date.now()}_${suffix}`;
}

function basicAuth(secretKey: string) {
  const token = btoa(`${secretKey}:`);
  return `Basic ${token}`;
}

async function chargeBillingKey(params: {
  tossSecretKey: string;
  billingKey: string;
  userId: string;
  orderId: string;
  orderName: string;
  amount: number;
}) {
  const response = await fetch(`https://api.tosspayments.com/v1/billing/${params.billingKey}`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(params.tossSecretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerKey: params.userId,
      orderId: params.orderId,
      orderName: params.orderName,
      amount: params.amount,
    }),
  });

  if (response.ok) {
    return {
      ok: true as const,
      data: (await response.json()) as TossChargeSuccess,
    };
  }

  return {
    ok: false as const,
    error: (await response.json()) as TossChargeFailure,
  };
}

async function getNextCycleIndex(supabase: ReturnType<typeof createClient>, subscriptionId: string) {
  const { data } = await supabase
    .from("subscription_cycles")
    .select("cycle_index")
    .eq("subscription_id", subscriptionId)
    .order("cycle_index", { ascending: false })
    .limit(1)
    .maybeSingle<{ cycle_index: number }>();

  return (data?.cycle_index ?? 0) + 1;
}

async function upsertEntitlement(params: {
  supabase: ReturnType<typeof createClient>;
  tenantId: string;
  userId: string;
  programId: string;
  sourceOrderId: string;
  startsAt: string;
  endsAt: string;
}) {
  const { supabase, tenantId, userId, programId, sourceOrderId, startsAt, endsAt } = params;
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from("program_entitlements")
    .select("id, ends_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; ends_at: string | null }>();

  if (existing) {
    const nextEndsAt =
      !existing.ends_at || new Date(existing.ends_at) < new Date(endsAt) ? endsAt : existing.ends_at;

    const { error } = await supabase
      .from("program_entitlements")
      .update({
        ends_at: nextEndsAt,
        is_active: true,
      })
      .eq("id", existing.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("program_entitlements").insert({
    tenant_id: tenantId,
    user_id: userId,
    program_id: programId,
    source_order_id: sourceOrderId,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: true,
  });

  if (error) throw error;
}

Deno.serve(async (req) => {
  try {
    if (!isAuthorized(req)) {
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const supabaseUrl = assertEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = assertEnv("SUPABASE_SERVICE_ROLE_KEY");
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const limitParam = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, Math.floor(limitParam))) : 50;
    const tossSecretKey = dryRun ? Deno.env.get("TOSS_SECRET_KEY") ?? "" : assertEnv("TOSS_SECRET_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const nowIso = new Date().toISOString();
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select(
        "id, tenant_id, user_id, product_id, status, billing_key, cancel_at_period_end, current_period_start_at, current_period_end_at, next_billing_at, product:product_id(id, price_krw, sale_type, billing_interval, subscription_grace_days, program_id)"
      )
      .in("status", ["active", "past_due"])
      .lte("next_billing_at", nowIso)
      .order("next_billing_at", { ascending: true })
      .limit(limit)
      .returns<SubscriptionRow[]>();

    if (subscriptionError) {
      return json(500, { ok: false, message: subscriptionError.message });
    }

    const items = subscriptions ?? [];
    const summary = {
      ok: true,
      dryRun,
      dueCount: items.length,
      processed: 0,
      paid: 0,
      failed: 0,
      canceled: 0,
      skipped: 0,
      results: [] as Array<{ subscriptionId: string; status: string; message: string }>,
    };

    for (const subscription of items) {
      summary.processed += 1;

      if (!subscription.product || subscription.product.sale_type !== "subscription") {
        summary.skipped += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "skipped",
          message: "Product is missing or not subscription",
        });
        continue;
      }

      if (subscription.cancel_at_period_end) {
        const periodEnd = subscription.current_period_end_at ? new Date(subscription.current_period_end_at) : null;
        const now = new Date();

        if (periodEnd && now >= periodEnd) {
          if (!dryRun) {
            await supabase
              .from("user_subscriptions")
              .update({
                status: "canceled",
                next_billing_at: null,
                canceled_at: subscription.current_period_end_at,
              })
              .eq("id", subscription.id);
          }

          summary.canceled += 1;
          summary.results.push({
            subscriptionId: subscription.id,
            status: "canceled",
            message: "Canceled at period end",
          });
          continue;
        }

        summary.skipped += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "skipped",
          message: "Cancel at period end is set and period has not ended",
        });
        continue;
      }

      if (!subscription.billing_key) {
        if (!dryRun) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
              last_failed_at: new Date().toISOString(),
              next_billing_at: new Date(Date.now() + ONE_DAY_MS).toISOString(),
            })
            .eq("id", subscription.id);
        }

        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: "Missing billing_key",
        });
        continue;
      }

      const cycleStartSeed = subscription.next_billing_at ?? new Date().toISOString();
      const range = addMonthlyRange(cycleStartSeed);
      const orderId = createProviderOrderId(subscription.id);
      const orderName = `${subscription.product.program_id} monthly subscription`;

      if (dryRun) {
        summary.paid += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "paid",
          message: `Dry-run success amount=${subscription.product.price_krw} orderId=${orderId}`,
        });
        continue;
      }

      const chargeResult = await chargeBillingKey({
        tossSecretKey,
        billingKey: subscription.billing_key,
        userId: subscription.user_id,
        orderId,
        orderName,
        amount: subscription.product.price_krw,
      });

      if (!chargeResult.ok) {
        const failReason = chargeResult.error.message ?? "Recurring payment failed";
        const nextRetryAt = new Date(Date.now() + ONE_DAY_MS).toISOString();
        const cycleIndex = await getNextCycleIndex(supabase, subscription.id);

        const { data: failedOrder } = await supabase
          .from("program_orders")
          .insert({
            tenant_id: subscription.tenant_id,
            buyer_user_id: subscription.user_id,
            product_id: subscription.product_id,
            amount_krw: subscription.product.price_krw,
            status: "failed",
            provider: "toss",
            provider_order_id: orderId,
            fail_reason: failReason,
          })
          .select("id")
          .maybeSingle<{ id: string }>();

        await supabase.from("subscription_cycles").insert({
          subscription_id: subscription.id,
          cycle_index: cycleIndex,
          cycle_start_at: range.cycleStartAt,
          cycle_end_at: range.cycleEndAt,
          amount_krw: subscription.product.price_krw,
          status: "failed",
          provider_order_id: orderId,
          fail_reason: failReason,
          failed_at: new Date().toISOString(),
        });

        await supabase
          .from("user_subscriptions")
          .update({
            status: "past_due",
            last_failed_at: new Date().toISOString(),
            next_billing_at: nextRetryAt,
          })
          .eq("id", subscription.id);

        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: `${failReason}${failedOrder?.id ? ` (order=${failedOrder.id})` : ""}`,
        });
        continue;
      }

      const approvedAt = chargeResult.data.approvedAt
        ? new Date(chargeResult.data.approvedAt).toISOString()
        : new Date().toISOString();
      const cycleIndex = await getNextCycleIndex(supabase, subscription.id);

      const { data: paidOrder, error: paidOrderError } = await supabase
        .from("program_orders")
        .insert({
          tenant_id: subscription.tenant_id,
          buyer_user_id: subscription.user_id,
          product_id: subscription.product_id,
          amount_krw: subscription.product.price_krw,
          status: "paid",
          provider: "toss",
          provider_order_id: orderId,
          payment_key: chargeResult.data.paymentKey,
          raw_confirm: chargeResult.data,
          paid_at: approvedAt,
        })
        .select("id")
        .maybeSingle<{ id: string }>();

      if (paidOrderError || !paidOrder) {
        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: paidOrderError?.message ?? "Failed to create paid order",
        });
        continue;
      }

      const { error: cycleError } = await supabase.from("subscription_cycles").insert({
        subscription_id: subscription.id,
        cycle_index: cycleIndex,
        cycle_start_at: range.cycleStartAt,
        cycle_end_at: range.cycleEndAt,
        amount_krw: subscription.product.price_krw,
        status: "paid",
        provider_order_id: orderId,
        provider_payment_key: chargeResult.data.paymentKey,
        paid_at: approvedAt,
      });

      if (cycleError) {
        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: cycleError.message,
        });
        continue;
      }

      const { error: subscriptionUpdateError } = await supabase
        .from("user_subscriptions")
        .update({
          status: "active",
          current_period_start_at: range.cycleStartAt,
          current_period_end_at: range.cycleEndAt,
          next_billing_at: range.nextBillingAt,
          last_paid_at: approvedAt,
          last_failed_at: null,
        })
        .eq("id", subscription.id);

      if (subscriptionUpdateError) {
        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: subscriptionUpdateError.message,
        });
        continue;
      }

      try {
        await upsertEntitlement({
          supabase,
          tenantId: subscription.tenant_id,
          userId: subscription.user_id,
          programId: subscription.product.program_id,
          sourceOrderId: paidOrder.id,
          startsAt: range.cycleStartAt,
          endsAt: range.cycleEndAt,
        });
      } catch (error) {
        summary.failed += 1;
        summary.results.push({
          subscriptionId: subscription.id,
          status: "failed",
          message: error instanceof Error ? error.message : "Failed to upsert entitlement",
        });
        continue;
      }

      summary.paid += 1;
      summary.results.push({
        subscriptionId: subscription.id,
        status: "paid",
        message: `Paid order=${paidOrder.id}`,
      });
    }

    return json(200, summary);
  } catch (error) {
    return json(500, {
      ok: false,
      message: error instanceof Error ? error.message : "Unexpected error",
    });
  }
});
