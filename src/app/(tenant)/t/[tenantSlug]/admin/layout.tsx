import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
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
  const { isAdmin } = await requireAdminUser();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fde7e7_0%,#fff5f5_45%,#ffffff_100%)] px-4 py-12">
        <main className="mx-auto max-w-2xl">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e6f7ee_0%,#f7fcf8_45%,#ffffff_100%)] px-4 py-8">
      <main className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin</CardTitle>
              <CardDescription>콘텐츠, 클래스, 초대, 사용자 권한을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AdminNav />
              <Button asChild variant="outline" className="w-full">
                <Link href="/">홈으로 가기</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
        <section>{children}</section>
      </main>
    </div>
  );
}
