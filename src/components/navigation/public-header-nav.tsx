"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PublicProfileMenu } from "@/components/navigation/public-profile-menu";
import { cn } from "@/lib/utils";

type PublicHeaderNavProps = {
  isLoggedIn: boolean;
  accountActionHref: string;
  accountActionLabel: "마이페이지" | "대시보드";
  profileActionHref: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

export function PublicHeaderNav({
  isLoggedIn,
  accountActionHref,
  accountActionLabel,
  profileActionHref,
  displayName,
  email,
  avatarUrl,
}: PublicHeaderNavProps) {
  const pathname = usePathname();

  const isLogin = pathname === "/login";
  const fallback = (displayName || email || "U").trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/store/assist-on" className="text-sm font-semibold tracking-wide text-zinc-900">
          XON TRAINING
        </Link>

        <div className="flex items-center gap-5">
          {isLoggedIn ? (
            <PublicProfileMenu
              email={email}
              displayName={displayName}
              avatarUrl={avatarUrl}
              fallback={fallback}
              accountActionHref={accountActionHref}
              accountActionLabel={accountActionLabel}
              profileActionHref={profileActionHref}
            />
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
