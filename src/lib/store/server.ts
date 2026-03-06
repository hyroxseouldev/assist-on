import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type StoreProduct = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  is_active: boolean;
  sale_type: "one_time" | "subscription";
  billing_interval: "monthly" | null;
  thumbnail_urls: string[];
  content_html: string;
  program: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
  };
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
  is_active: boolean;
  sale_type: "one_time" | "subscription" | null;
  billing_interval: "monthly" | null;
  thumbnail_urls: unknown;
  content_html: string | null;
  program: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    tenant_id: string;
  } | null;
};

type DirectoryProductRow = {
  id: string;
  tenant_id: string;
  price_krw: number;
  sale_type: "one_time" | "subscription" | null;
  thumbnail_urls: unknown;
  tenant: {
    id: string;
    slug: string;
    name: string;
  } | null;
};

type TenantBrandingRow = {
  tenant_id: string;
  team_name: string | null;
  logo_url: string | null;
  slogan: string | null;
};

export async function getStoreTenantDirectory() {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("program_products")
    .select("id, tenant_id, price_krw, sale_type, thumbnail_urls, tenant:tenant_id(id, slug, name)")
    .eq("is_active", true)
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
      .returns<TenantBrandingRow[]>();

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

  const { data } = await supabase
    .from("program_products")
    .select(
      "id, tenant_id, program_id, price_krw, is_active, sale_type, billing_interval, thumbnail_urls, content_html, program:program_id(id, title, description, start_date, end_date, tenant_id)"
    )
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<ProductRow[]>();

  const products: StoreProduct[] = (data ?? [])
    .filter((row): row is ProductRow & { program: NonNullable<ProductRow["program"]> } => Boolean(row.program))
    .map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      program_id: row.program_id,
      price_krw: row.price_krw,
      is_active: row.is_active,
      sale_type: row.sale_type === "subscription" ? "subscription" : "one_time",
      billing_interval: row.sale_type === "subscription" ? (row.billing_interval ?? "monthly") : null,
      thumbnail_urls: Array.isArray(row.thumbnail_urls)
        ? row.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
        : [],
      content_html: row.content_html ?? "",
      program: {
        id: row.program.id,
        title: row.program.title,
        description: row.program.description,
        start_date: row.program.start_date,
        end_date: row.program.end_date,
      },
    }));

  return {
    tenant,
    products,
  };
}

export async function getStoreProductById(tenantSlug: string, productId: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("program_products")
    .select(
      "id, tenant_id, program_id, price_krw, is_active, sale_type, billing_interval, thumbnail_urls, content_html, program:program_id(id, title, description, start_date, end_date, tenant_id)"
    )
    .eq("tenant_id", tenant.id)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle<ProductRow>();

  if (!data || !data.program) {
    return null;
  }

  return {
    tenant,
    product: {
      id: data.id,
      tenant_id: data.tenant_id,
      program_id: data.program_id,
      price_krw: data.price_krw,
      is_active: data.is_active,
      sale_type: data.sale_type === "subscription" ? "subscription" : "one_time",
      billing_interval: data.sale_type === "subscription" ? (data.billing_interval ?? "monthly") : null,
      thumbnail_urls: Array.isArray(data.thumbnail_urls)
        ? data.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
        : [],
      content_html: data.content_html ?? "",
      program: {
        id: data.program.id,
        title: data.program.title,
        description: data.program.description,
        start_date: data.program.start_date,
        end_date: data.program.end_date,
      },
    } satisfies StoreProduct,
  };
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
