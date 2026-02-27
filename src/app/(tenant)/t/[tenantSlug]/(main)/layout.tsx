import { redirect } from "next/navigation";

import { HomeSidebar } from "@/components/home/home-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canManageTenantContent, getTenantBySlug, getUserTenantRole } from "@/lib/tenant/server";

export default async function TenantMainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tenant/login");
  }

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    redirect("/t/select");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; avatar_url: string | null }>();

  const tenantRole = await getUserTenantRole(supabase, user.id, tenant.id);
  const nowIso = new Date().toISOString();
  const { data: entitlementRows } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .limit(1)
    .returns<Array<{ id: string }>>();

  const hasMembershipOrEntitlement = Boolean(tenantRole) || (entitlementRows?.length ?? 0) > 0;

  if (!hasMembershipOrEntitlement) {
    redirect(`/store/${tenantSlug}`);
  }

  const displayName =
    typeof profile?.full_name === "string" && profile.full_name.length > 0
      ? profile.full_name
      : typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : user.email ?? "Athlete";
  const avatarUrl =
    typeof profile?.avatar_url === "string"
      ? profile.avatar_url
      : typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9fbe6_0%,#f7faf8_45%,#ffffff_100%)]">
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-8 lg:h-[60vh] lg:self-start">
          <HomeSidebar
            displayName={displayName}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            isAdmin={canManageTenantContent(tenantRole)}
          />
        </aside>
        <section className="space-y-6">{children}</section>
      </main>
    </div>
  );
}
