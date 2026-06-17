"use client";

import Link from "next/link";

import { PublicProfileMenu } from "@/components/navigation/public-profile-menu";

type PublicHeaderNavProps = {
  brandHref?: string;
  brandLabel?: string;
  isLoggedIn: boolean;
  accountActionHref: string;
  accountActionLabel: "대시보드";
  displayName: string;
  email: string;
  avatarUrl?: string | null;
};

export function PublicHeaderNav({
  brandHref = "/",
  brandLabel = "CLYRTRAINING",
  isLoggedIn,
  accountActionHref,
  accountActionLabel,
  displayName,
  email,
  avatarUrl,
}: PublicHeaderNavProps) {
  const fallback = (displayName || email || "U").trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={brandHref} className="text-sm font-semibold tracking-wide text-zinc-900">
          {brandLabel}
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
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
