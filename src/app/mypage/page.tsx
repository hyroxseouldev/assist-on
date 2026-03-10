import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MENU_ITEMS = [
  {
    href: "/mypage/orders",
    title: "주문/구매 내역",
    description: "무통장 주문, 카드결제, 정기결제 기록을 다시 확인합니다.",
    badge: "신규",
  },
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
  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">마이페이지</h1>
        <p className="text-sm text-zinc-600">왼쪽 메뉴에서 항목을 선택해 계정과 구독 정보를 관리하세요.</p>
      </section>

      <Card className="border-zinc-200/80">
        <CardHeader>
          <CardTitle>빠른 이동</CardTitle>
          <CardDescription>자주 사용하는 메뉴를 바로 열 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-200/80 p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-zinc-600">{item.description}</p>
              </div>
              <Badge variant={item.badge === "신규" ? "secondary" : "outline"}>{item.badge}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
