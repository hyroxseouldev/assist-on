import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantRole = "owner" | "coach" | "member";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
};

type TenantUserProfileRow = {
  tenant_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  tenant_status: "active" | "deactivated" | null;
  deactivated_at: string | null;
};

type GlobalProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  account_status?: "active" | "deactivated" | null;
  deactivated_at?: string | null;
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

export function resolveTenantDisplayName(
  tenantProfile: Pick<TenantUserProfileRow, "display_name"> | null | undefined,
  globalProfile: Pick<GlobalProfileRow, "full_name"> | null | undefined,
  user?: { email?: string | null; user_metadata?: { full_name?: string | null } } | null,
  fallback = "회원"
) {
  return (
    tenantProfile?.display_name?.trim() ||
    globalProfile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.trim() ||
    fallback
  );
}

export function resolveTenantAvatarUrl(
  tenantProfile: Pick<TenantUserProfileRow, "avatar_url"> | null | undefined,
  globalProfile: Pick<GlobalProfileRow, "avatar_url"> | null | undefined,
  user?: { user_metadata?: { avatar_url?: string | null } } | null
) {
  return tenantProfile?.avatar_url ?? globalProfile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
}

export async function getTenantUserProfile(supabase: SupabaseServerClient, tenantId: string, userId: string) {
  const { data } = await supabase
    .from("tenant_user_profiles")
    .select("tenant_id, user_id, display_name, avatar_url, tenant_status, deactivated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle<TenantUserProfileRow>();

  return data ?? null;
}

export async function listTenantUserProfiles(supabase: SupabaseServerClient, tenantId: string, userIds: string[]) {
  if (userIds.length === 0) {
    return [] as TenantUserProfileRow[];
  }

  const { data } = await supabase
    .from("tenant_user_profiles")
    .select("tenant_id, user_id, display_name, avatar_url, tenant_status, deactivated_at")
    .eq("tenant_id", tenantId)
    .in("user_id", userIds)
    .returns<TenantUserProfileRow[]>();

  return data ?? [];
}

export async function ensureTenantUserProfile(
  supabase: SupabaseServerClient,
  tenantId: string,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string | null; avatar_url?: string | null } }
) {
  const existing = await getTenantUserProfile(supabase, tenantId, user.id);
  if (existing) {
    return existing;
  }

  const { data: globalProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, account_status, deactivated_at")
    .eq("id", user.id)
    .maybeSingle<GlobalProfileRow>();

  const seed = {
    tenant_id: tenantId,
    user_id: user.id,
    display_name: resolveTenantDisplayName(null, globalProfile, user),
    avatar_url: resolveTenantAvatarUrl(null, globalProfile, user),
    tenant_status: globalProfile?.account_status === "deactivated" ? "deactivated" : "active",
    deactivated_at: globalProfile?.account_status === "deactivated" ? globalProfile.deactivated_at ?? new Date().toISOString() : null,
  };

  const { data } = await supabase
    .from("tenant_user_profiles")
    .upsert(seed, { onConflict: "tenant_id,user_id" })
    .select("tenant_id, user_id, display_name, avatar_url, tenant_status, deactivated_at")
    .maybeSingle<TenantUserProfileRow>();

  return data ?? seed;
}
