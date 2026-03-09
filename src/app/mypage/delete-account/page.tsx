import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountDeleteForm } from "@/components/account/account-delete-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyDeleteAccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage/delete-account")}`);
  }

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">계정 삭제</h1>
        <p className="text-sm text-zinc-600">삭제는 비활성화 방식으로 처리되며, 이후 로그인할 수 없습니다.</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>계정 비활성화</CardTitle>
          <CardDescription>계정을 비활성화하면 마이페이지 접근이 중단되고, 활성 구독은 해지 예약 처리됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountDeleteForm />
          <Button asChild variant="outline" className="h-10">
            <Link href="/mypage">마이페이지로 돌아가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
