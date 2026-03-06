import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserSubscriptionListItem = {
  id: string;
  status: "incomplete" | "active" | "past_due" | "canceled";
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  current_period_start_at: string | null;
  current_period_end_at: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  last_failed_at: string | null;
  created_at: string;
  product: {
    id: string;
    price_krw: number;
    billing_interval: "monthly" | null;
    program: {
      id: string;
      title: string;
    } | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

type UserSubscriptionRow = {
  id: string;
  status: "incomplete" | "active" | "past_due" | "canceled";
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  current_period_start_at: string | null;
  current_period_end_at: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  last_failed_at: string | null;
  created_at: string;
  product: {
    id: string;
    price_krw: number;
    billing_interval: "monthly" | null;
    program: {
      id: string;
      title: string;
    } | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

export async function getMySubscriptions(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_subscriptions")
    .select(
      "id, status, cancel_at_period_end, canceled_at, current_period_start_at, current_period_end_at, next_billing_at, last_paid_at, last_failed_at, created_at, product:product_id(id, price_krw, billing_interval, program:program_id(id, title), tenant:tenant_id(id, name, slug))"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserSubscriptionRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    cancel_at_period_end: row.cancel_at_period_end,
    canceled_at: row.canceled_at,
    current_period_start_at: row.current_period_start_at,
    current_period_end_at: row.current_period_end_at,
    next_billing_at: row.next_billing_at,
    last_paid_at: row.last_paid_at,
    last_failed_at: row.last_failed_at,
    created_at: row.created_at,
    product: row.product
      ? {
          id: row.product.id,
          price_krw: row.product.price_krw,
          billing_interval: row.product.billing_interval,
          program: row.product.program,
          tenant: row.product.tenant,
        }
      : null,
  })) satisfies UserSubscriptionListItem[];
}
