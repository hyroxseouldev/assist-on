"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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
  const isLogin = pathname === "/login";
  const isDashboard = pathname.includes("/admin");
  const isMyPage = pathname.startsWith("/mypage") || pathname.includes("/profile");
  const isAccountActionActive = accountActionLabel === "대시보드" ? isDashboard : isMyPage;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-900">
          XON TRAINING
        </Link>

        <nav className="flex items-center gap-5">
          <Link href="/store" className={cn(baseLinkClass, isStore ? activeLinkClass : undefined)}>
            스토어
          </Link>
        </nav>

        <div className="flex items-center gap-5">
          {isLoggedIn ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn("h-9 px-3", isAccountActionActive ? "bg-zinc-100 text-zinc-950 hover:bg-zinc-100" : undefined)}
              >
                <Link href={accountActionHref} aria-current={isAccountActionActive ? "page" : undefined}>
                  {accountActionLabel}
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn("text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950", isLogin ? "bg-zinc-100 text-zinc-950" : undefined)}
            >
              <Link href="/login" aria-current={isLogin ? "page" : undefined}>
                로그인
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
