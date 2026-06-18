import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TenantMembershipRole = "owner" | "coach" | "member";

export type TenantMembershipRow = {
  tenant_id: string;
  role: TenantMembershipRole;
  tenants: {
    slug: string;
  } | null;
};

export function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export function normalizeTenantMemberships(rows: TenantMembershipRow[] | null | undefined) {
  return (rows ?? [])
    .map((membership) => {
      const slug = membership.tenants?.slug;
      if (!slug) {
        return null;
      }

      return {
        slug,
        role: membership.role,
      };
    })
    .filter((membership): membership is { slug: string; role: TenantMembershipRole } => Boolean(membership));
}

export function getFirstAdminTenantPath(memberships: Array<{ slug: string; role: TenantMembershipRole }>) {
  const adminMembership = memberships.find((membership) => membership.role === "owner" || membership.role === "coach");
  return adminMembership ? `/t/${adminMembership.slug}/admin` : null;
}

export function getFirstAdminTenantSlug(memberships: Array<{ slug: string; role: TenantMembershipRole }>) {
  return memberships.find((membership) => membership.role === "owner" || membership.role === "coach")?.slug ?? null;
}

export function getDefaultSignedInPath(memberships: Array<{ slug: string; role: TenantMembershipRole }>) {
  return getFirstAdminTenantSlug(memberships) ? "/admin" : null;
}

export async function getSignedInHomePath(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants:tenant_id(slug)")
    .eq("user_id", user.id)
    .returns<TenantMembershipRow[]>();

  return getDefaultSignedInPath(normalizeTenantMemberships(memberships));
}
