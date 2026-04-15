import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrimaryProgramCoach } from "@/lib/coach-profiles";
import {
  type DurationPassMonths,
  type DurationPassOption,
} from "@/lib/store/duration-options";
import { getTenantBySlug } from "@/lib/tenant/server";

export type StoreProduct = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  sale_status: "active" | "preparing" | "private";
  is_active: boolean;
  sale_type: "one_time" | "subscription";
  billing_interval: "monthly" | null;
  thumbnail_urls: string[];
  intro_image_url: string;
  content_html: string;
  duration_options: DurationPassOption[];
  coach?: {
    name: string;
    image_url: string;
    instagram: string;
    career: string[];
  };
  bank_account: StoreBankAccount;
  program: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    daily_workout_minutes: number;
    days_per_week: number;
    start_date: string;
    end_date: string;
  };
};

export type StoreBankAccount = {
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_deposit_guide: string;
};

export type StoreCheckoutOrderSummary = {
  provider_order_id: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  status: string;
  amount_krw: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  depositor_name: string;
  created_at: string;
  duration_months: DurationPassMonths | null;
  product: {
    id: string;
    program: {
      title: string;
      thumbnail_url: string | null;
    } | null;
  } | null;
  bank_account: StoreBankAccount;
};

export type MyOrderListItem = {
  id: string;
  provider_order_id: string;
  status: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  amount_krw: number;
  buyer_name: string;
  depositor_name: string;
  created_at: string;
  paid_at: string | null;
  duration_months: DurationPassMonths | null;
  product: {
    id: string;
    sale_type: "one_time" | "subscription";
    program: {
      id: string;
      title: string;
      thumbnail_url: string | null;
    } | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
  bank_account: StoreBankAccount | null;
};

export type PendingProductOrderSummary = {
  id: string;
  provider_order_id: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  created_at: string;
  duration_months: DurationPassMonths | null;
};

export type MyOrderDetail = MyOrderListItem & {
  buyer_email: string;
  buyer_phone: string;
};

export type StoreTenantDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  logo_url: string | null;
  cover_image_url: string | null;
  active_product_count: number;
  min_price_krw: number | null;
  has_subscription_product: boolean;
};

type ProductRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  sale_status: "active" | "preparing" | "private" | null;
  is_active: boolean;
  sale_type: "one_time" | "subscription" | null;
  billing_interval: "monthly" | null;
  thumbnail_urls: unknown;
  intro_image_url: string | null;
  content_html: string | null;
  program: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    description: string;
    coach_name: string | null;
    coach_instagram: string | null;
    coach_career: unknown;
    difficulty: "beginner" | "intermediate" | "advanced";
    daily_workout_minutes: number;
    days_per_week: number;
    start_date: string;
    end_date: string;
    tenant_id: string;
  } | null;
};

type DurationOptionRow = {
  product_id: string;
  duration_months: DurationPassMonths;
  price_krw: number;
  is_enabled: boolean;
};

type DirectoryProductRow = {
  id: string;
  tenant_id: string;
  price_krw: number;
  sale_status: "active" | "preparing" | "private" | null;
  sale_type: "one_time" | "subscription" | null;
  thumbnail_urls: unknown;
  tenant: {
    id: string;
    slug: string;
    name: string;
  } | null;
};

type TenantBrandingDirectoryRow = {
  tenant_id: string;
  team_name: string | null;
  logo_url: string | null;
  slogan: string | null;
};

type TenantBrandingDetailRow = {
  tenant_id: string;
  team_name?: string | null;
  coach_name: string | null;
  coach_image_url: string | null;
  coach_instagram: string | null;
  coach_career: unknown;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  bank_deposit_guide?: string | null;
};

type StoreCheckoutOrderRow = {
  provider_order_id: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  status: string;
  amount_krw: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  depositor_name: string | null;
  created_at: string;
  duration_months: DurationPassMonths | null;
  product: {
    id: string;
    program: {
      title: string;
      thumbnail_url: string | null;
    } | null;
  } | null;
};

type MyOrderRow = {
  id: string;
  provider_order_id: string;
  status: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  amount_krw: number;
  buyer_name: string | null;
  depositor_name: string | null;
  created_at: string;
  paid_at: string | null;
  duration_months: DurationPassMonths | null;
  product: {
    id: string;
    sale_type: "one_time" | "subscription" | null;
    program: {
      id: string;
      title: string;
      thumbnail_url: string | null;
    } | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

type PendingProductOrderRow = {
  id: string;
  provider_order_id: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  created_at: string;
  duration_months: DurationPassMonths | null;
};

function pickFirstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

type MyOrderDetailRow = {
  id: string;
  provider_order_id: string;
  status: string;
  payment_method: "bank_transfer" | "toss_card" | "toss_subscription" | null;
  amount_krw: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  depositor_name: string | null;
  created_at: string;
  paid_at: string | null;
  duration_months: DurationPassMonths | null;
  product: {
    id: string;
    sale_type: "one_time" | "subscription" | null;
    program: {
      id: string;
      title: string;
      thumbnail_url: string | null;
    } | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    } | null;
  } | null;
};

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function mapBankAccount(branding: TenantBrandingDetailRow | null | undefined): StoreBankAccount {
  return {
    bank_name: branding?.bank_name?.trim() ?? "",
    bank_account_number: branding?.bank_account_number?.trim() ?? "",
    bank_account_holder: branding?.bank_account_holder?.trim() ?? "",
    bank_deposit_guide: branding?.bank_deposit_guide?.trim() ?? "",
  };
}

function mapDurationOptionsByProductId(rows: DurationOptionRow[] | null | undefined) {
  const mapped = new Map<string, DurationPassOption[]>();

  for (const row of rows ?? []) {
    const current = mapped.get(row.product_id) ?? [];
    current.push({
      duration_months: row.duration_months,
      price_krw: row.price_krw,
      is_enabled: row.is_enabled,
    });
    current.sort((a, b) => a.duration_months - b.duration_months);
    mapped.set(row.product_id, current);
  }

  return mapped;
}

function getDisplayPrice(row: Pick<StoreProduct, "sale_type" | "price_krw" | "duration_options">) {
  if (row.sale_type === "subscription") {
    return row.price_krw;
  }

  const enabledOptionPrice = row.duration_options
    .filter((option) => option.is_enabled)
    .map((option) => option.price_krw)
    .sort((a, b) => a - b)[0];

  return enabledOptionPrice ?? row.price_krw;
}

export async function getStoreTenantDirectory() {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("program_products")
    .select("id, tenant_id, price_krw, sale_status, sale_type, thumbnail_urls, tenant:tenant_id(id, slug, name)")
    .in("sale_status", ["active", "preparing"])
    .returns<DirectoryProductRow[]>();

  const grouped = new Map<string, StoreTenantDirectoryItem>();

  for (const row of products ?? []) {
    if (!row.tenant) continue;

    const existing = grouped.get(row.tenant_id);
    const thumbnail = Array.isArray(row.thumbnail_urls)
      ? row.thumbnail_urls.find((url): url is string => typeof url === "string" && url.length > 0) ?? null
      : null;

    if (!existing) {
      grouped.set(row.tenant_id, {
        id: row.tenant.id,
        slug: row.tenant.slug,
        name: row.tenant.name,
        slogan: "",
        logo_url: null,
        cover_image_url: thumbnail,
        active_product_count: 1,
        min_price_krw: row.price_krw,
        has_subscription_product: row.sale_type === "subscription",
      });
      continue;
    }

    existing.active_product_count += 1;
    existing.min_price_krw = existing.min_price_krw === null ? row.price_krw : Math.min(existing.min_price_krw, row.price_krw);
    existing.has_subscription_product = existing.has_subscription_product || row.sale_type === "subscription";
    if (!existing.cover_image_url && thumbnail) {
      existing.cover_image_url = thumbnail;
    }
  }

  const tenantIds = Array.from(grouped.keys());
  if (tenantIds.length > 0) {
    const { data: brandings } = await supabase
      .from("tenant_branding")
      .select("tenant_id, team_name, logo_url, slogan")
      .in("tenant_id", tenantIds)
      .returns<TenantBrandingDirectoryRow[]>();

    for (const branding of brandings ?? []) {
      const item = grouped.get(branding.tenant_id);
      if (!item) continue;
      item.name = branding.team_name?.trim() ? branding.team_name.trim() : item.name;
      item.logo_url = branding.logo_url;
      item.slogan = branding.slogan?.trim() ?? "";
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function getStoreProductsByTenantSlug(tenantSlug: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const [{ data }, { data: branding }] = await Promise.all([
    supabase
      .from("program_products")
      .select(
        "id, tenant_id, program_id, price_krw, sale_status, is_active, sale_type, billing_interval, thumbnail_urls, intro_image_url, content_html, program:program_id(id, title, thumbnail_url, description, coach_name, coach_instagram, coach_career, difficulty, daily_workout_minutes, days_per_week, start_date, end_date, tenant_id)"
      )
      .eq("tenant_id", tenant.id)
      .in("sale_status", ["active", "preparing"])
      .order("created_at", { ascending: false })
      .returns<ProductRow[]>(),
    supabase
      .from("tenant_branding")
      .select("tenant_id, team_name")
      .eq("tenant_id", tenant.id)
      .maybeSingle<Pick<TenantBrandingDetailRow, "tenant_id" | "team_name">>(),
  ]);

  const displayName = branding?.team_name?.trim() || tenant.name;
  const productIds = (data ?? []).map((row) => row.id);
  const { data: durationOptions } = productIds.length
    ? await supabase
        .from("program_product_duration_options")
        .select("product_id, duration_months, price_krw, is_enabled")
        .in("product_id", productIds)
        .returns<DurationOptionRow[]>()
    : { data: [] as DurationOptionRow[] };
  const durationOptionsByProductId = mapDurationOptionsByProductId(durationOptions);

  const products: StoreProduct[] = (data ?? [])
    .filter((row): row is ProductRow & { program: NonNullable<ProductRow["program"]> } => Boolean(row.program))
    .map((row) => {
      const product = {
        id: row.id,
        tenant_id: row.tenant_id,
        program_id: row.program_id,
        price_krw: row.price_krw,
        sale_status:
          row.sale_status === "active" || row.sale_status === "preparing" || row.sale_status === "private"
            ? row.sale_status
            : row.is_active
            ? "active"
            : "private",
        is_active: row.is_active,
        sale_type: row.sale_type === "subscription" ? "subscription" : "one_time",
        billing_interval: row.sale_type === "subscription" ? (row.billing_interval ?? "monthly") : null,
        thumbnail_urls: Array.isArray(row.thumbnail_urls)
          ? row.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
          : [],
        intro_image_url: row.intro_image_url?.trim() ?? "",
        content_html: row.content_html ?? "",
        duration_options: durationOptionsByProductId.get(row.id) ?? [],
        bank_account: mapBankAccount(null),
        program: {
          id: row.program.id,
          title: row.program.title,
          thumbnail_url: row.program.thumbnail_url,
          description: row.program.description,
          difficulty: row.program.difficulty,
          daily_workout_minutes: row.program.daily_workout_minutes,
          days_per_week: row.program.days_per_week,
          start_date: row.program.start_date,
          end_date: row.program.end_date,
        },
      } satisfies StoreProduct;

      return {
        ...product,
        price_krw: getDisplayPrice(product),
      } satisfies StoreProduct;
    });

  return {
    tenant: {
      ...tenant,
      name: displayName,
    },
    products,
  };
}

export async function getStoreProductById(tenantSlug: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const [{ data }, { data: durationOptions }] = await Promise.all([
    supabase
      .from("program_products")
      .select(
        "id, tenant_id, program_id, price_krw, sale_status, is_active, sale_type, billing_interval, thumbnail_urls, intro_image_url, content_html, program:program_id(id, title, thumbnail_url, description, coach_name, coach_instagram, coach_career, difficulty, daily_workout_minutes, days_per_week, start_date, end_date, tenant_id)"
      )
      .eq("tenant_id", tenant.id)
      .eq("id", productId)
      .in("sale_status", ["active", "preparing"])
      .maybeSingle<ProductRow>(),
    supabase
      .from("program_product_duration_options")
      .select("product_id, duration_months, price_krw, is_enabled")
      .eq("product_id", productId)
      .returns<DurationOptionRow[]>(),
  ]);

  if (!data || !data.program) {
    return null;
  }

  const { data: branding } = await supabase
    .from("tenant_branding")
    .select(
      "tenant_id, coach_name, coach_image_url, coach_instagram, coach_career, bank_name, bank_account_number, bank_account_holder, bank_deposit_guide"
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingDetailRow>();
  const primaryCoach = await getPrimaryProgramCoach(supabase, data.program.id);

  const mappedDurationOptions = mapDurationOptionsByProductId(durationOptions).get(productId) ?? [];
  const brandingCareer = parseStringArray(branding?.coach_career);
  const programCareer = parseStringArray(data.program.coach_career);

  const product = {
    id: data.id,
    tenant_id: data.tenant_id,
    program_id: data.program_id,
    price_krw: data.price_krw,
    sale_status:
      data.sale_status === "active" || data.sale_status === "preparing" || data.sale_status === "private"
        ? data.sale_status
        : data.is_active
        ? "active"
        : "private",
    is_active: data.is_active,
    sale_type: data.sale_type === "subscription" ? "subscription" : "one_time",
    billing_interval: data.sale_type === "subscription" ? (data.billing_interval ?? "monthly") : null,
    thumbnail_urls: Array.isArray(data.thumbnail_urls)
      ? data.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [],
    intro_image_url: data.intro_image_url?.trim() ?? "",
    content_html: data.content_html ?? "",
    duration_options: mappedDurationOptions,
    coach: {
      name: pickFirstText(primaryCoach?.display_name, branding?.coach_name, data.program.coach_name) || "코치",
      image_url: primaryCoach?.image_url || branding?.coach_image_url?.trim() || "",
      instagram: pickFirstText(primaryCoach?.instagram, branding?.coach_instagram, data.program.coach_instagram),
      career: primaryCoach ? primaryCoach.career : brandingCareer.length > 0 ? brandingCareer : programCareer,
    },
    bank_account: mapBankAccount(branding),
    program: {
      id: data.program.id,
      title: data.program.title,
      thumbnail_url: data.program.thumbnail_url,
      description: data.program.description,
      difficulty: data.program.difficulty,
      daily_workout_minutes: data.program.daily_workout_minutes,
      days_per_week: data.program.days_per_week,
      start_date: data.program.start_date,
      end_date: data.program.end_date,
    },
  } satisfies StoreProduct;

  return {
    tenant,
    product: {
      ...product,
      price_krw: getDisplayPrice(product),
    } satisfies StoreProduct,
  };
}

export async function getStoreCheckoutOrderSummary(params: {
  tenantSlug: string;
  providerOrderId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, params.tenantSlug);
  if (!tenant) {
    return null;
  }

  const [{ data: order }, { data: branding }] = await Promise.all([
    supabase
      .from("program_orders")
      .select(
        "provider_order_id, payment_method, status, amount_krw, buyer_name, buyer_email, buyer_phone, depositor_name, created_at, duration_months, product:product_id(id, program:program_id(title, thumbnail_url))"
      )
      .eq("tenant_id", tenant.id)
      .eq("buyer_user_id", params.userId)
      .eq("provider_order_id", params.providerOrderId)
      .maybeSingle<StoreCheckoutOrderRow>(),
    supabase
      .from("tenant_branding")
      .select("tenant_id, bank_name, bank_account_number, bank_account_holder, bank_deposit_guide")
      .eq("tenant_id", tenant.id)
      .maybeSingle<TenantBrandingDetailRow>(),
  ]);

  if (!order) {
    return null;
  }

  return {
    provider_order_id: order.provider_order_id,
    payment_method: order.payment_method,
    status: order.status,
    amount_krw: order.amount_krw,
    buyer_name: order.buyer_name?.trim() ?? "",
    buyer_email: order.buyer_email?.trim() ?? "",
    buyer_phone: order.buyer_phone?.trim() ?? "",
    depositor_name: order.depositor_name?.trim() ?? "",
    created_at: order.created_at,
    duration_months: order.duration_months,
    product: order.product,
    bank_account: mapBankAccount(branding),
  } satisfies StoreCheckoutOrderSummary;
}

export async function getMyOrders(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase
    .from("program_orders")
    .select(
      "id, provider_order_id, status, payment_method, amount_krw, buyer_name, depositor_name, created_at, paid_at, duration_months, product:product_id(id, sale_type, program:program_id(id, title, thumbnail_url), tenant:tenant_id(id, name, slug))"
    )
    .eq("buyer_user_id", userId)
    .order("created_at", { ascending: false })
    .returns<MyOrderRow[]>();

  const tenantIds = [...new Set((orders ?? []).map((row) => row.product?.tenant?.id).filter((value): value is string => Boolean(value)))];
  const { data: brandings } = tenantIds.length
    ? await supabase
        .from("tenant_branding")
        .select("tenant_id, bank_name, bank_account_number, bank_account_holder, bank_deposit_guide")
        .in("tenant_id", tenantIds)
        .returns<TenantBrandingDetailRow[]>()
    : { data: [] as TenantBrandingDetailRow[] };

  const bankAccountByTenantId = new Map((brandings ?? []).map((branding) => [branding.tenant_id, mapBankAccount(branding)]));

  return (orders ?? []).map((row) => ({
    id: row.id,
    provider_order_id: row.provider_order_id,
    status: row.status,
    payment_method: row.payment_method,
    amount_krw: row.amount_krw,
    buyer_name: row.buyer_name?.trim() ?? "",
    depositor_name: row.depositor_name?.trim() ?? "",
    created_at: row.created_at,
    paid_at: row.paid_at,
    duration_months: row.duration_months,
    product: row.product
      ? {
          id: row.product.id,
          sale_type: row.product.sale_type === "subscription" ? "subscription" : "one_time",
          program: row.product.program,
          tenant: row.product.tenant,
        }
      : null,
    bank_account: row.product?.tenant ? bankAccountByTenantId.get(row.product.tenant.id) ?? null : null,
  })) satisfies MyOrderListItem[];
}

export async function getPendingOrderForProduct(params: { userId: string; tenantId: string; productId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("program_orders")
    .select("id, provider_order_id, payment_method, created_at, duration_months")
    .eq("buyer_user_id", params.userId)
    .eq("tenant_id", params.tenantId)
    .eq("product_id", params.productId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PendingProductOrderRow>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    provider_order_id: data.provider_order_id,
    payment_method: data.payment_method,
    created_at: data.created_at,
    duration_months: data.duration_months,
  } satisfies PendingProductOrderSummary;
}

export async function getMyOrderDetail(params: { userId: string; orderId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("program_orders")
    .select(
      "id, provider_order_id, status, payment_method, amount_krw, buyer_name, buyer_email, buyer_phone, depositor_name, created_at, paid_at, duration_months, product:product_id(id, sale_type, program:program_id(id, title, thumbnail_url), tenant:tenant_id(id, name, slug))"
    )
    .eq("buyer_user_id", params.userId)
    .eq("id", params.orderId)
    .maybeSingle<MyOrderDetailRow>();

  if (!order) {
    return null;
  }

  const tenantId = order.product?.tenant?.id;
  const { data: branding } = tenantId
    ? await supabase
        .from("tenant_branding")
        .select("tenant_id, bank_name, bank_account_number, bank_account_holder, bank_deposit_guide")
        .eq("tenant_id", tenantId)
        .maybeSingle<TenantBrandingDetailRow>()
    : { data: null as TenantBrandingDetailRow | null };

  return {
    id: order.id,
    provider_order_id: order.provider_order_id,
    status: order.status,
    payment_method: order.payment_method,
    amount_krw: order.amount_krw,
    buyer_name: order.buyer_name?.trim() ?? "",
    buyer_email: order.buyer_email?.trim() ?? "",
    buyer_phone: order.buyer_phone?.trim() ?? "",
    depositor_name: order.depositor_name?.trim() ?? "",
    created_at: order.created_at,
    paid_at: order.paid_at,
    duration_months: order.duration_months,
    product: order.product
      ? {
          id: order.product.id,
          sale_type: order.product.sale_type === "subscription" ? "subscription" : "one_time",
          program: order.product.program,
          tenant: order.product.tenant,
        }
      : null,
    bank_account: tenantId ? mapBankAccount(branding) : null,
  } satisfies MyOrderDetail;
}

export async function hasActiveEntitlement(userId: string, tenantId: string, programId: string) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .limit(1)
    .maybeSingle<{ id: string }>();

  return Boolean(data?.id);
}
