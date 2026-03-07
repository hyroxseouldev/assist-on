import Image from "next/image";
import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminProfileRailMenu } from "@/components/admin/admin-profile-rail-menu";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { isAdmin, isPlatformAdmin, supabase, user, tenantRole, tenant } = await requireAdminUser();

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

  const [profileRes, tenantBrandingRes, primaryProgramRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string | null; avatar_url: string | null }>(),
    supabase
      .from("tenant_branding")
      .select("team_name, logo_url")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ team_name: string | null; logo_url: string | null }>(),
    supabase
      .from("programs")
      .select("team_name, thumbnail_url")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ team_name: string | null; thumbnail_url: string | null }>(),
  ]);
  const profile = profileRes.data;
  const tenantBranding = tenantBrandingRes.data;
  const primaryProgram = primaryProgramRes.data;

  const displayName =
    typeof profile?.full_name === "string" && profile.full_name.length > 0
      ? profile.full_name
      : typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : user.email ?? "Admin";
  const avatarUrl =
    typeof profile?.avatar_url === "string"
      ? profile.avatar_url
      : typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;
  const fallback = displayName.slice(0, 1).toUpperCase();
  const roleLabel = isPlatformAdmin ? "platform admin" : tenantRole ?? "admin";
  const brandName =
    tenantBranding?.team_name?.trim() ||
    primaryProgram?.team_name?.trim() ||
    tenant.name?.trim() ||
    "Assist On";
  const brandLogoUrl =
    tenantBranding?.logo_url?.trim() ||
    primaryProgram?.thumbnail_url?.trim() ||
    "/xon_logo.jpg";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-zinc-200/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/t/${tenantSlug}/admin`} className="flex min-w-0 items-center gap-2">
              <span className="relative block size-8 overflow-hidden rounded-md border border-zinc-200 bg-white">
                <Image src={brandLogoUrl} alt={`${brandName} 로고`} fill className="object-cover" sizes="32px" />
              </span>
              <span className="truncate text-sm font-semibold text-zinc-900 group-data-[collapsible=icon]:hidden">{brandName}</span>
            </Link>
            <SidebarTrigger className="hidden md:inline-flex" />
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-3">
          <AdminNav />
        </SidebarContent>
        <SidebarFooter className="gap-3 border-t border-zinc-200/80 p-3 group-data-[collapsible=icon]:hidden">
          <AdminProfileMenu
            displayName={displayName}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            fallback={fallback}
            roleLabel={roleLabel}
            tenantBasePath={`/t/${tenantSlug}`}
          />
          <div className="space-y-2 rounded-md bg-zinc-50/60 p-2">
            <Button asChild variant="outline" className="w-full bg-white">
              <Link href="/">홈으로 가기</Link>
            </Button>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="w-full bg-white">
                로그아웃
              </Button>
            </form>
          </div>
        </SidebarFooter>
        <div className="hidden border-t border-zinc-200/80 p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <AdminProfileRailMenu
            displayName={displayName}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            fallback={fallback}
            roleLabel={roleLabel}
            tenantBasePath={`/t/${tenantSlug}`}
          />
        </div>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="bg-white">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:py-10">
          <div className="mb-4 md:hidden">
            <SidebarTrigger />
          </div>
          <section className="min-w-0">{children}</section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
