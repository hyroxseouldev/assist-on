import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  await params;
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
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Admin</CardTitle>
              <CardDescription>콘텐츠, 클래스, 멤버 권한을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-3">
              <div className="rounded-md bg-zinc-50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar size="lg" className="size-11">
                    <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
                    <p className="truncate text-xs text-zinc-500">{user.email ?? ""}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{roleLabel}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AdminNav />
              </div>
              <div className="space-y-2 border-t pt-3">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/update-password">비밀번호 변경</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">홈으로 가기</Link>
                </Button>
                <form action={logoutAction}>
                  <Button type="submit" variant="outline" className="w-full">
                    로그아웃
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
    </div>
  );
}
