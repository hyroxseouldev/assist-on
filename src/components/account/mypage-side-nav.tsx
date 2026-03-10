"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Home, ShieldAlert, UserRound, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type MyPageMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const MY_PAGE_MENU_ITEMS: MyPageMenuItem[] = [
  { href: "/mypage", label: "마이페이지 홈", icon: Home },
  { href: "/mypage/orders", label: "주문/구매 내역", icon: FileText },
  { href: "/mypage/subscriptions", label: "구독 관리", icon: CreditCard },
  { href: "/mypage/active-programs", label: "내 활성 프로그램", icon: Wallet },
  { href: "/mypage/profile", label: "프로필 설정", icon: UserRound },
  { href: "/mypage/delete-account", label: "계정 삭제", icon: ShieldAlert },
];

function isMenuActive(pathname: string, href: string) {
  if (href === "/mypage") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MyPageSideNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="마이페이지 메뉴" className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {MY_PAGE_MENU_ITEMS.map((item) => {
          const active = isMenuActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden rounded-lg border border-zinc-200 bg-white p-2 lg:block">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold tracking-wide text-zinc-500">MY PAGE</p>
        <ul className="space-y-1">
          {MY_PAGE_MENU_ITEMS.map((item) => {
            const active = isMenuActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                    active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900",
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
