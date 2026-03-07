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

export type MyProgramAccessItem = {
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
  program: {
    id: string;
    title: string;
  } | null;
  subscription: {
    id: string;
    status: "incomplete" | "active" | "past_due" | "canceled";
    cancel_at_period_end: boolean;
    next_billing_at: string | null;
    current_period_start_at: string | null;
    current_period_end_at: string | null;
    created_at: string;
    product: {
      id: string;
      price_krw: number;
      billing_interval: "monthly" | null;
    } | null;
  } | null;
  entitlement: {
    has_any: boolean;
    is_accessible_now: boolean;
    latest_starts_at: string | null;
    latest_ends_at: string | null;
    is_active: boolean | null;
  };
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

type ProgramEntitlementRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  program: {
    id: string;
    title: string;
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

function isEntitlementAccessibleNow(row: Pick<ProgramEntitlementRow, "is_active" | "ends_at">, nowMs: number) {
  if (!row.is_active) return false;
  if (!row.ends_at) return true;
  const endsAtMs = Date.parse(row.ends_at);
  if (Number.isNaN(endsAtMs)) return false;
  return endsAtMs >= nowMs;
}

export async function getMyProgramAccesses(userId: string) {
  const supabase = await createSupabaseServerClient();
  const [subscriptionsRes, entitlementRes] = await Promise.all([
    supabase
      .from("user_subscriptions")
      .select(
        "id, status, cancel_at_period_end, current_period_start_at, current_period_end_at, next_billing_at, created_at, product:product_id(id, price_krw, billing_interval, program:program_id(id, title), tenant:tenant_id(id, name, slug))"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<
        Array<{
          id: string;
          status: "incomplete" | "active" | "past_due" | "canceled";
          cancel_at_period_end: boolean;
          current_period_start_at: string | null;
          current_period_end_at: string | null;
          next_billing_at: string | null;
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
        }>
      >(),
    supabase
      .from("program_entitlements")
      .select(
        "id, tenant_id, program_id, starts_at, ends_at, is_active, created_at, program:program_id(id, title, tenant:tenant_id(id, name, slug))"
      )
      .eq("user_id", userId)
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<ProgramEntitlementRow[]>(),
  ]);

  const subscriptionRows = subscriptionsRes.data ?? [];
  const entitlementRows = entitlementRes.data ?? [];
  const nowMs = Date.now();

  const byKey = new Map<string, MyProgramAccessItem>();

  for (const row of entitlementRows) {
    const tenant = row.program?.tenant ?? null;
    const program = row.program
      ? {
          id: row.program.id,
          title: row.program.title,
        }
      : null;
    const key = `${row.tenant_id}:${row.program_id}`;
    const current = byKey.get(key);
    const accessibleNow = isEntitlementAccessibleNow(row, nowMs);

    if (!current) {
      byKey.set(key, {
        tenant,
        program,
        subscription: null,
        entitlement: {
          has_any: true,
          is_accessible_now: accessibleNow,
          latest_starts_at: row.starts_at,
          latest_ends_at: row.ends_at,
          is_active: row.is_active,
        },
      });
      continue;
    }

    current.entitlement.has_any = true;
    current.entitlement.is_accessible_now = current.entitlement.is_accessible_now || accessibleNow;

    const currentStartsMs = current.entitlement.latest_starts_at ? Date.parse(current.entitlement.latest_starts_at) : Number.NEGATIVE_INFINITY;
    const rowStartsMs = Date.parse(row.starts_at);
    if (!Number.isNaN(rowStartsMs) && rowStartsMs >= currentStartsMs) {
      current.entitlement.latest_starts_at = row.starts_at;
      current.entitlement.latest_ends_at = row.ends_at;
      current.entitlement.is_active = row.is_active;
      if (!current.program && program) {
        current.program = program;
      }
      if (!current.tenant && tenant) {
        current.tenant = tenant;
      }
    }
  }

  for (const row of subscriptionRows) {
    const tenant = row.product?.tenant ?? null;
    const program = row.product?.program ?? null;
    if (!tenant || !program) {
      continue;
    }

    const key = `${tenant.id}:${program.id}`;
    const current = byKey.get(key);
    const mappedSubscription = {
      id: row.id,
      status: row.status,
      cancel_at_period_end: row.cancel_at_period_end,
      next_billing_at: row.next_billing_at,
      current_period_start_at: row.current_period_start_at,
      current_period_end_at: row.current_period_end_at,
      created_at: row.created_at,
      product: row.product
        ? {
            id: row.product.id,
            price_krw: row.product.price_krw,
            billing_interval: row.product.billing_interval,
          }
        : null,
    };

    if (!current) {
      byKey.set(key, {
        tenant,
        program,
        subscription: mappedSubscription,
        entitlement: {
          has_any: false,
          is_accessible_now: false,
          latest_starts_at: null,
          latest_ends_at: null,
          is_active: null,
        },
      });
      continue;
    }

    if (!current.subscription) {
      current.subscription = mappedSubscription;
    }
    if (!current.program && program) {
      current.program = program;
    }
    if (!current.tenant && tenant) {
      current.tenant = tenant;
    }
  }

  const items = Array.from(byKey.values());

  const score = (item: MyProgramAccessItem) => {
    if (item.entitlement.is_accessible_now) return 0;
    if (item.subscription?.status === "active") return 1;
    if (item.subscription?.status === "past_due") return 2;
    if (item.subscription?.status === "incomplete") return 3;
    if (item.subscription?.status === "canceled") return 4;
    if (item.entitlement.has_any) return 5;
    return 6;
  };

  return items.sort((a, b) => {
    const scoreDiff = score(a) - score(b);
    if (scoreDiff !== 0) return scoreDiff;

    const aLatest = Date.parse(a.subscription?.created_at ?? a.entitlement.latest_starts_at ?? "") || 0;
    const bLatest = Date.parse(b.subscription?.created_at ?? b.entitlement.latest_starts_at ?? "") || 0;
    return bLatest - aLatest;
  });
}
