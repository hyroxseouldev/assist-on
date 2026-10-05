"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { PublicProfileMenu } from "@/components/navigation/public-profile-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type TenantHeaderNavProps = {
  brandLabel: string;
  logoUrl?: string | null;
  isLoggedIn: boolean;
  accountActionHref: string;
  accountActionLabel: "대시보드";
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

const NAV_ITEMS = [
  { label: "홈", href: "/" },
] as const;

export function TenantHeaderNav({
  brandLabel,
  logoUrl,
  isLoggedIn,
  accountActionHref,
  accountActionLabel,
  displayName,
  email,
  avatarUrl,
}: TenantHeaderNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const loginHref = "/login";
  const fallback = (displayName || email || "U").trim().charAt(0).toUpperCase() || "U";
  const navItems = NAV_ITEMS;

  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 text-ink-emphasis">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-subtle">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${brandLabel} 로고`} fill className="object-cover" sizes="40px" />
              ) : (
                <span className="text-xs font-semibold tracking-eyebrow-wide text-ink-muted">TENANT</span>
              )}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-ink-emphasis">{brandLabel}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const href = item.href;
              const isActive = pathname === href;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-emphasis",
                    isActive ? "bg-surface-muted text-ink-emphasis" : undefined
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="모바일 메뉴 열기">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-full max-w-sm gap-0 p-0 sm:max-w-sm">
              <SheetHeader className="border-b border-line px-6 py-5 text-left">
                <SheetTitle className="text-base text-ink-emphasis">{brandLabel}</SheetTitle>
                <SheetDescription className="text-ink-subtle">이동할 메뉴를 선택해 주세요.</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col px-4 py-4">
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const href = item.href;
                    const isActive = pathname === href;

                    return (
                      <Link
                        key={`mobile-${item.label}`}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink-emphasis",
                          isActive ? "bg-surface-muted text-ink-emphasis" : undefined
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-6 border-t border-line pt-4">
                  {isLoggedIn ? (
                    <div className="flex flex-col gap-2">
                      <div className="px-4 pb-2">
                        <p className="truncate text-sm font-semibold text-ink-emphasis">{displayName}</p>
                        <p className="truncate text-xs text-ink-subtle">{email}</p>
                      </div>

                      <Link
                        href={accountActionHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-emphasis"
                      >
                        <LayoutDashboard className="size-4" />
                        {accountActionLabel}
                      </Link>

                      <form action={logoutAction}>
                        <input type="hidden" name="redirectTo" value="/" />
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink-emphasis"
                        >
                          <LogOut className="size-4" />
                          로그아웃
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Button asChild variant="ghost" appearance="tenant-mobile" className="h-11 justify-start">
                      <Link href={loginHref} onClick={() => setMobileMenuOpen(false)}>
                        로그인
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {isLoggedIn ? (
            <div className="hidden md:block">
              <PublicProfileMenu
                email={email}
                displayName={displayName}
                avatarUrl={avatarUrl}
                fallback={fallback}
                accountActionHref={accountActionHref}
                accountActionLabel={accountActionLabel}
                logoutRedirectTo="/"
              />
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" appearance="tenant-menu" className="hidden md:inline-flex">
              <Link href={loginHref}>로그인</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
