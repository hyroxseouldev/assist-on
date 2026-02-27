import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmTossPayment } from "@/lib/store/toss";

export default async function PublicCheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { tenantSlug } = await params;
  const { paymentKey, orderId, amount } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/tenant/login?next=${encodeURIComponent(`/store/${tenantSlug}/checkout/success`)}`);
  }

  if (!paymentKey || !orderId || !amount) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>결제 정보를 확인할 수 없습니다.</CardTitle>
            <CardDescription>다시 결제를 시도해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const result = await confirmTossPayment({
    tenantSlug,
    paymentKey,
    orderId,
    amount: Number(amount),
    userId: user.id,
  });

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{result.ok ? "결제가 완료되었습니다." : "결제 확인에 실패했습니다."}</CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button asChild>
            <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
          </Button>
          {result.ok ? (
            <Button asChild variant="outline">
              <Link href={`/t/${tenantSlug}`}>홈으로 이동</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
