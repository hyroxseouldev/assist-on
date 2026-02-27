import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicCheckoutFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { tenantSlug } = await params;
  const { code, message } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>결제가 완료되지 않았습니다.</CardTitle>
          <CardDescription>{message ?? "잠시 후 다시 시도해 주세요."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {code ? <p className="text-xs text-zinc-500">오류 코드: {code}</p> : null}
          <div className="space-x-2">
            <Button asChild>
              <Link href={`/store/${tenantSlug}`}>스토어로 돌아가기</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/t/${tenantSlug}`}>홈으로 이동</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
