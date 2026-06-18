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
import { requireAdminUser } from "@/lib/admin/server";
import { resolveTenantBrandLogoUrl, resolveTenantBrandName } from "@/lib/tenant/branding";
import { ensureTenantUserProfile, resolveTenantAvatarUrl, resolveTenantDisplayName } from "@/lib/tenant/server";

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { isAdmin, isPlatformAdmin, supabase, user, tenantRole, tenant } = await requireAdminUser(tenantSlug, { allowCoach: true });

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

  const [tenantProfile, profileRes, tenantBrandingRes] = await Promise.all([
    ensureTenantUserProfile(supabase, tenant.id, user),
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string | null; avatar_url: string | null }>(),
    supabase
      .from("tenant_branding")
      .select("logo_url")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ logo_url: string | null }>(),
  ]);
  const profile = profileRes.data;
  const tenantBranding = tenantBrandingRes.data;

  const displayName = resolveTenantDisplayName(tenantProfile, profile, user, "Admin");
  const avatarUrl = resolveTenantAvatarUrl(tenantProfile, profile, user) ?? undefined;
  const fallback = displayName.slice(0, 1).toUpperCase();
  const roleLabel = isPlatformAdmin ? "platform admin" : tenantRole ?? "admin";
  const brandName = resolveTenantBrandName(tenant.name);
  const brandLogoUrl = resolveTenantBrandLogoUrl(tenantBranding?.logo_url);

  return (
    <AdminNavigationProvider adminBasePath="/admin">
      <SidebarProvider>
        <Sidebar
          collapsible="icon"
          className="group-data-[side=left]:border-r-0! [&_[data-slot=sidebar-inner]]:bg-zinc-200/70"
        >
          <SidebarHeader className="h-[62px] justify-center border-b border-zinc-200/70 px-3 py-0 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1.5">
            <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
              <Link
                href="/admin"
                className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center"
              >
                <span className="relative block size-8 overflow-hidden rounded-md border border-zinc-200 bg-white group-data-[collapsible=icon]:size-10">
                  <Image src={brandLogoUrl} alt={`${brandName} 로고`} fill className="object-cover" sizes="40px" />
                </span>
                <span className="truncate text-sm font-semibold text-zinc-900 group-data-[collapsible=icon]:hidden">{brandName}</span>
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-3">
            <AdminNav isPlatformAdmin={isPlatformAdmin} tenantRole={tenantRole} />
          </SidebarContent>
          <SidebarFooter className="px-3 pb-4 pt-2 group-data-[collapsible=icon]:hidden">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold leading-snug text-zinc-900">혹시 사용에 어려움이 있으신가요?</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                궁금한 점이나 도움이 필요한 부분이 있다면 Instagram{" "}
                <a
                  href="https://instagram.com/kxxclear"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-zinc-900 underline underline-offset-4"
                >
                  @kxxclear
                </a>
                로 편하게 연락주세요.
              </p>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="bg-zinc-200/70 md:peer-data-[state=collapsed]:p-0 md:peer-data-[state=collapsed]:[&>div]:rounded-none md:peer-data-[state=expanded]:p-1.5 md:peer-data-[state=expanded]:[&>div]:overflow-visible md:peer-data-[state=expanded]:[&>div]:rounded-2xl">
          <div className="flex min-h-svh flex-col bg-zinc-50">
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
  );
}
