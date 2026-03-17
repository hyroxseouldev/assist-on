import { headers } from "next/headers";

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

function extractTenantSlugFromPath(pathname: string | null) {
  if (!pathname) {
    return null;
  }

  const tenantPathMatch = pathname.match(/^\/t\/([^/]+)/);
  if (tenantPathMatch?.[1]) {
    return tenantPathMatch[1];
  }

  const storePathMatch = pathname.match(/^\/store\/([^/]+)/);
  return storePathMatch?.[1] ?? null;
}

export async function getRequestTenantSlug() {
  const headerStore = await headers();
  const directPath =
    headerStore.get("x-pathname") ??
    headerStore.get("x-invoke-path") ??
    headerStore.get("x-matched-path") ??
    headerStore.get("next-url");

  const directTenantSlug = extractTenantSlugFromPath(directPath);
  if (directTenantSlug) {
    return directTenantSlug;
  }

  const referer = headerStore.get("referer");
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    return extractTenantSlugFromPath(refererUrl.pathname);
  } catch {
    return null;
  }
}

export async function getTenantBySlug(supabase: SupabaseServerClient, slug?: string) {
  const tenantSlug = slug ?? (await getRequestTenantSlug());

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
