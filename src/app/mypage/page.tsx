import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicHeader } from "@/components/navigation/public-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MENU_ITEMS = [
  {
    href: "/mypage/subscriptions",
    title: "구독 관리",
    description: "모든 테넌트 구독 상태를 확인하고 해지/복구를 관리합니다.",
    badge: "기존",
  },
  {
    href: "/mypage/active-programs",
    title: "내 활성 프로그램",
    description: "현재 구독 중인 프로그램과 이동 링크를 확인합니다.",
    badge: "신규",
  },
  {
    href: "/mypage/profile",
    title: "프로필 설정",
    description: "프로필 사진과 이름 같은 기본 계정 정보를 수정합니다.",
    badge: "신규",
  },
  {
    href: "/mypage/delete-account",
    title: "계정 삭제",
    description: "계정을 비활성화하고 접근을 중단합니다.",
    badge: "신규",
  },
] as const;

export default async function MyPageHome() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

  if (profile?.account_status === "deactivated") {
    await supabase.auth.signOut();
    redirect("/login?error=deactivated");
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="mb-5 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">마이페이지</h1>
          <p className="text-sm text-zinc-600">계정 관련 설정과 구독 정보를 한 곳에서 관리하세요.</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {MENU_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full border-zinc-200/80 transition-colors group-hover:border-zinc-300">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <Badge variant={item.badge === "신규" ? "secondary" : "outline"}>{item.badge}</Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">바로가기</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
