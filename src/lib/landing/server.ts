import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreProductsByTenantSlug } from "@/lib/store/server";
import { getTenantById } from "@/lib/tenant/server";

export type TenantMarketingLandingData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  branding: {
    team_name: string | null;
    slogan: string | null;
    description: string | null;
    logo_url: string | null;
  };
  products: Array<{
    id: string;
    price_krw: number;
    sale_type: "one_time" | "subscription";
    program: {
      title: string;
      description: string;
      difficulty: "beginner" | "intermediate" | "advanced";
      daily_workout_minutes: number;
      days_per_week: number;
      start_date: string;
      end_date: string;
      thumbnail_url: string | null;
    };
    thumbnail_urls: string[];
  }>;
};

type TenantBrandingRow = {
  team_name: string | null;
  slogan: string | null;
  description: string | null;
  logo_url: string | null;
};

export async function getTenantMarketingLandingDataByTenantId(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantById(supabase, tenantId);

  if (!tenant) {
    return null;
  }

  const [{ data: branding }, storeData] = await Promise.all([
    supabase.from("tenant_branding").select("team_name, slogan, description, logo_url").eq("tenant_id", tenant.id).maybeSingle<TenantBrandingRow>(),
    getStoreProductsByTenantSlug(tenant.slug),
  ]);

  return {
    tenant,
    branding: {
      team_name: branding?.team_name ?? null,
      slogan: branding?.slogan ?? null,
      description: branding?.description ?? null,
      logo_url: branding?.logo_url ?? null,
    },
    products: (storeData?.products ?? []).slice(0, 3),
  } satisfies TenantMarketingLandingData;
}
