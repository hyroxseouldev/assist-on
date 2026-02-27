import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const TENANT_COOKIE_KEY = "assiston_tenant_slug";
export const DEFAULT_TENANT_SLUG = "assist-on";

export type TenantRole = "owner" | "coach" | "member";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
};

type ProfileRoleRow = {
  platform_role: string | null;
  role: string | null;
};

export function canManageTenantContent(role: TenantRole | null) {
  return role === "owner" || role === "coach";
}

export function canManageTenantMembers(role: TenantRole | null) {
  return role === "owner";
}

export async function getCurrentTenantSlug() {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE_KEY)?.value ?? DEFAULT_TENANT_SLUG;
}

export async function getTenantBySlug(supabase: SupabaseServerClient, slug?: string) {
  const tenantSlug = slug ?? (await getCurrentTenantSlug());

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", tenantSlug)
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
    .select("platform_role, role")
    .eq("id", userId)
    .maybeSingle<ProfileRoleRow>();

  return profile?.platform_role === "admin" || profile?.role === "admin";
}
