import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type StoreProduct = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  is_active: boolean;
  program: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
  };
};

type ProductRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  is_active: boolean;
  program: {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    tenant_id: string;
  } | null;
};

export async function getStoreProductsByTenantSlug(tenantSlug: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("program_products")
    .select("id, tenant_id, program_id, price_krw, is_active, program:program_id(id, title, description, start_date, end_date, tenant_id)")
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
    .select("id, tenant_id, program_id, price_krw, is_active, program:program_id(id, title, description, start_date, end_date, tenant_id)")
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
