"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings2, UserRound } from "lucide-react";
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
import { getTenantUserLoginPath } from "@/lib/auth/paths";
import { cn } from "@/lib/utils";

type TenantHeaderNavProps = {
  tenantSlug: string;
  brandLabel: string;
  logoUrl?: string | null;
  isLoggedIn: boolean;
  accountActionHref: string;
  accountActionLabel: "마이페이지" | "대시보드";
  profileActionHref: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

const NAV_ITEMS = [
  { label: "홈", href: "" },
  { label: "지점", href: "/locations" },
  { label: "스토어", href: "/store" },
  { label: "예약 서비스", href: "/booking" },
] as const;

export function TenantHeaderNav({
  tenantSlug,
  brandLabel,
  logoUrl,
  isLoggedIn,
  accountActionHref,
  accountActionLabel,
  profileActionHref,
  displayName,
  email,
  avatarUrl,
}: TenantHeaderNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tenantBasePath = `/t/${tenantSlug}`;
  const loginHref = getTenantUserLoginPath(tenantSlug, tenantBasePath);
  const fallback = (displayName || email || "U").trim().charAt(0).toUpperCase() || "U";
  const navItems = process.env.NEXT_PUBLIC_MODE === "development" ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/booking");

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href={tenantBasePath} className="flex items-center gap-3 text-zinc-950">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              {logoUrl ? (
                <Image src={logoUrl} alt={`${brandLabel} 로고`} fill className="object-cover" sizes="40px" />
              ) : (
                <span className="text-xs font-semibold tracking-[0.18em] text-zinc-600">TENANT</span>
              )}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-zinc-950">{brandLabel}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const href = `${tenantBasePath}${item.href}`;
              const isActive = item.href ? pathname.startsWith(href) : pathname === tenantBasePath;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                    isActive ? "bg-zinc-100 text-zinc-950" : undefined
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
              <SheetHeader className="border-b border-zinc-200 px-6 py-5 text-left">
                <SheetTitle className="text-base text-zinc-950">{brandLabel}</SheetTitle>
                <SheetDescription className="text-zinc-500">이동할 메뉴를 선택해 주세요.</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col px-4 py-4">
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => {
                    const href = `${tenantBasePath}${item.href}`;
                    const isActive = item.href ? pathname.startsWith(href) : pathname === tenantBasePath;

                    return (
                      <Link
                        key={`mobile-${item.label}`}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                          isActive ? "bg-zinc-100 text-zinc-950" : undefined
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-6 border-t border-zinc-200 pt-4">
                  {isLoggedIn ? (
                    <div className="flex flex-col gap-2">
                      <div className="px-4 pb-2">
                        <p className="truncate text-sm font-semibold text-zinc-950">{displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{email}</p>
                      </div>

                      <Link
                        href={accountActionHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        <UserRound className="size-4" />
                        {accountActionLabel}
                      </Link>

                      <Link
                        href={profileActionHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        <Settings2 className="size-4" />
                        프로필 수정
                      </Link>

                      <form action={logoutAction}>
                        <input type="hidden" name="redirectTo" value={tenantBasePath} />
                        <button
                          type="submit"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                        >
                          <LogOut className="size-4" />
                          로그아웃
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Button asChild variant="ghost" className="h-11 justify-start rounded-2xl px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950">
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
                profileActionHref={profileActionHref}
                logoutRedirectTo={tenantBasePath}
              />
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 md:inline-flex">
              <Link href={loginHref}>로그인</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
