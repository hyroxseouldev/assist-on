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
  const { isAdmin, isPlatformAdmin, supabase, user, tenantRole } = await requireAdminUser();

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; avatar_url: string | null }>();

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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-1 border-b border-zinc-200/70 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
            <CardTitle className="text-lg group-data-[collapsible=icon]:hidden">Admin</CardTitle>
            <SidebarTrigger className="hidden md:inline-flex" />
          </div>
          <CardDescription className="group-data-[collapsible=icon]:hidden">콘텐츠, 클래스, 멤버 권한을 관리합니다.</CardDescription>
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
          <div className="mb-4 flex items-center gap-2">
            <SidebarTrigger />
            <p className="text-sm font-semibold text-zinc-700">Admin Menu</p>
          </div>
          <section className="min-w-0">{children}</section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
