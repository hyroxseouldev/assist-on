"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PublicProfileMenu } from "@/components/navigation/public-profile-menu";
import { Button } from "@/components/ui/button";
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
  { label: "랜딩", href: "" },
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
  const tenantBasePath = `/t/${tenantSlug}`;
  const fallback = (displayName || email || "U").trim().charAt(0).toUpperCase() || "U";

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
            {NAV_ITEMS.map((item) => {
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
            <Button asChild variant="ghost" size="sm" className="text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950">
              <Link href={`/login?next=${encodeURIComponent(tenantBasePath)}`}>로그인</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
