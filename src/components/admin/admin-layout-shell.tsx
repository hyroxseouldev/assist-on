import Image from "next/image";
import Link from "next/link";

import { AdminNavigationProvider } from "@/components/admin/admin-navigation-feedback";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopHeader } from "@/components/admin/admin-top-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TenantSlugProvider } from "@/hooks/use-tenant-slug";
import { requireAdminUser } from "@/lib/admin/server";
import { resolveTenantBrandLogoUrl, resolveTenantBrandName } from "@/lib/tenant/branding";
import { getTenantUserProfile, resolveTenantAvatarUrl, resolveTenantDisplayName } from "@/lib/tenant/server";

type AdminLayoutShellProps = {
  children: React.ReactNode;
  tenantSlug: string;
};

export async function AdminLayoutShell({ children, tenantSlug }: AdminLayoutShellProps) {
  const { isAdmin, isPlatformAdmin, profile, supabase, user, tenantRole, tenant } = await requireAdminUser(tenantSlug, {
    allowCoach: true,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white px-4 py-12 sm:px-6">
        <main className="mx-auto w-full max-w-[1400px]">
          <Card>
            <CardHeader>
              <CardTitle>403 Forbidden</CardTitle>
              <CardDescription>관리자 권한이 필요합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-zinc-600">
              <p>현재 계정으로는 관리자 페이지에 접근할 수 없습니다.</p>
              <Link href="/" className="underline underline-offset-4">
                홈으로 이동
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [tenantProfile, tenantBrandingRes] = await Promise.all([
    getTenantUserProfile(supabase, tenant.id, user.id),
    supabase
      .from("tenant_branding")
      .select("brand_name, logo_url")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ brand_name: string | null; logo_url: string | null }>(),
  ]);
  const tenantBranding = tenantBrandingRes.data;
  const displayName = resolveTenantDisplayName(tenantProfile, profile, user, "Admin");
  const avatarUrl = resolveTenantAvatarUrl(tenantProfile, profile, user) ?? undefined;
  const fallback = displayName.slice(0, 1).toUpperCase();
  const roleLabel = isPlatformAdmin ? "플랫폼 관리자" : tenantRole === "owner" ? "오너" : tenantRole === "coach" ? "코치" : "멤버";
  const brandName = resolveTenantBrandName(tenantBranding?.brand_name || tenant.name);
  const brandLogoUrl = resolveTenantBrandLogoUrl(tenantBranding?.logo_url);

  return (
    <TenantSlugProvider tenantSlug={tenantSlug}>
      <AdminNavigationProvider adminBasePath="/admin">
        <SidebarProvider>
          <Sidebar
            collapsible="icon"
            className="group-data-[side=left]:border-r-zinc-200 [&_[data-slot=sidebar-inner]]:bg-white"
          >
            <SidebarHeader className="h-16 shrink-0 justify-center border-b border-zinc-200 bg-white px-4 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
              <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
                <Link
                  href="/admin"
                  className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
                >
                  <span className="relative block size-8 overflow-hidden rounded-md border border-zinc-200 bg-white group-data-[collapsible=icon]:size-10">
                    <Image src={brandLogoUrl} alt={`${brandName} 로고`} fill className="object-cover" sizes="40px" />
                  </span>
                  <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="block truncate text-sm font-semibold tracking-tight text-zinc-900">{brandName}</span>
                    <span className="mt-0.5 block text-[10px] font-medium tracking-[0.12em] text-zinc-400">WORKSPACE</span>
                  </span>
                </Link>
              </div>
            </SidebarHeader>
            <SidebarContent className="bg-white px-3 py-4 group-data-[collapsible=icon]:px-2">
              <AdminNav isPlatformAdmin={isPlatformAdmin} tenantRole={tenantRole} />
            </SidebarContent>
            <SidebarFooter className="bg-white px-3 pb-4 pt-2 group-data-[collapsible=icon]:hidden">
              <div className="border-t border-zinc-200/70 px-1 pt-4">
                <p className="text-xs font-medium text-zinc-600">도움이 필요하신가요?</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                  운영 문의 · Instagram{" "}
                  <a
                    href="https://instagram.com/clyr._.___"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-zinc-900 underline underline-offset-4"
                  >
                    @clyr._.___
                  </a>
                </p>
              </div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="min-w-0 bg-zinc-50 p-0">
            <div className="flex min-h-svh min-w-0 flex-col bg-zinc-50">
              <AdminTopHeader
                brandName={brandName}
                brandLogoUrl={brandLogoUrl}
                displayName={displayName}
                email={user.email ?? ""}
                avatarUrl={avatarUrl}
                fallback={fallback}
                roleLabel={roleLabel}
                adminBasePath="/admin"
                logoutRedirectTo="/"
              />
              <main className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 lg:px-5 lg:py-6">
                <section className="min-w-0">{children}</section>
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AdminNavigationProvider>
    </TenantSlugProvider>
  );
}
