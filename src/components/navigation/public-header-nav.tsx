"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type PublicHeaderNavProps = {
  isLoggedIn: boolean;
  tenantEntryHref: string;
};

const baseLinkClass = "text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950";
const activeLinkClass = "text-zinc-950";

export function PublicHeaderNav({ isLoggedIn, tenantEntryHref }: PublicHeaderNavProps) {
  const pathname = usePathname();

  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const isSubscriptions = pathname === "/mypage/subscriptions" || pathname === "/subscriptions";
  const isTenant = pathname.startsWith("/t/");

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-900">
          XON TRAINING
        </Link>

        <nav className="flex items-center gap-5">
          <Link href="/store" className={cn(baseLinkClass, isStore ? activeLinkClass : undefined)}>
            스토어
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/mypage/subscriptions"
                prefetch={false}
                className={cn(baseLinkClass, isSubscriptions ? activeLinkClass : undefined)}
              >
                내 구독
              </Link>
              <Link href={tenantEntryHref} className={cn(baseLinkClass, isTenant ? activeLinkClass : undefined)}>
                테넌트
              </Link>
            </>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <form action={logoutAction}>
              <button type="submit" className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950">
                로그아웃
              </button>
            </form>
          ) : (
            <Link href="/tenant/login" className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950">
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
