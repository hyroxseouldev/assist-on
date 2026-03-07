import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminProfileMenu } from "@/components/admin/admin-profile-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:py-10">
      <main className="mx-auto grid w-full max-w-[1400px] items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-8">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <Card className="h-full border-0">
            <CardHeader>
              <CardTitle className="text-lg">Admin</CardTitle>
              <CardDescription>콘텐츠, 클래스, 멤버 권한을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3">
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AdminNav />
              </div>
              <div className="space-y-3 border-t border-zinc-200/80 pt-4">
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
              </div>
            </CardContent>
          </Card>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
    </div>
  );
}
