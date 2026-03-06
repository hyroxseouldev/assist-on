"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

type PublicHeaderNavProps = {
  isLoggedIn: boolean;
  accountActionHref: string;
  accountActionLabel: "마이페이지" | "대시보드";
};

const baseLinkClass = "text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950";
const activeLinkClass = "text-zinc-950";

export function PublicHeaderNav({ isLoggedIn, accountActionHref, accountActionLabel }: PublicHeaderNavProps) {
  const pathname = usePathname();

  const isStore = pathname === "/store" || pathname.startsWith("/store/");
  const isDashboard = pathname.includes("/admin");
  const isMyPage = pathname.includes("/profile");
  const isAccountActionActive = accountActionLabel === "대시보드" ? isDashboard : isMyPage;

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
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href={accountActionHref} className={cn(baseLinkClass, isAccountActionActive ? activeLinkClass : undefined)}>
                {accountActionLabel}
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950">
                  로그아웃
                </button>
              </form>
            </>
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
