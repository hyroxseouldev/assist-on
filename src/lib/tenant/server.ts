import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantRole = "owner" | "coach" | "member";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
};

type ProfileRoleRow = {
  platform_role: string | null;
};

export function canManageTenantContent(role: TenantRole | null) {
  return role === "owner" || role === "coach";
}

export function canManageTenantMembers(role: TenantRole | null) {
  return role === "owner";
}

export async function getTenantBySlug(supabase: SupabaseServerClient, tenantSlug: string) {
  if (!tenantSlug) {
    return null;
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", tenantSlug)
    .maybeSingle<TenantRow>();

  return tenant ?? null;
}

export async function getTenantById(supabase: SupabaseServerClient, tenantId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("id", tenantId)
    .maybeSingle<TenantRow>();

  return tenant ?? null;
}

export async function getUserTenantRole(supabase: SupabaseServerClient, userId: string, tenantId: string) {
  const { data } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle<{ role: TenantRole }>();

  return data?.role ?? null;
}

export async function isPlatformAdmin(supabase: SupabaseServerClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle<ProfileRoleRow>();

  return profile?.platform_role === "admin";
}
