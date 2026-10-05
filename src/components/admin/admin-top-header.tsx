"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Home, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { AdminPasswordDialog } from "@/components/admin/admin-password-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";

type AdminTopHeaderProps = {
  brandName: string;
  brandLogoUrl: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  fallback: string;
  roleLabel: string;
  adminBasePath: string;
  logoutRedirectTo: string;
  showProfile?: boolean;
};

export function AdminTopHeader({
  brandName,
  brandLogoUrl,
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  adminBasePath,
  logoutRedirectTo,
  showProfile = true,
}: AdminTopHeaderProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 h-16 shrink-0 border-b border-line bg-white">
        <div className="flex h-full w-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger aria-label="사이드바 열기 또는 접기" appearance="admin" className="size-9 shrink-0" />
            <div className="hidden h-5 w-px bg-line sm:block" />
            <Link href={adminBasePath} className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-strong">
              <span className="relative block size-7 shrink-0 overflow-hidden rounded-md border border-line bg-white md:hidden">
                <Image src={brandLogoUrl} alt={`${brandName} 로고`} fill className="object-cover" sizes="28px" />
              </span>
              <span className="min-w-0">
                <span className="block max-w-27.5 truncate text-xs font-semibold text-ink sm:max-w-65 sm:text-sm">{brandName}</span>
                <span className="mt-0.5 hidden text-caption text-ink-subtle sm:block">운영 워크스페이스</span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center">
            <AdminHeaderProfileMenu
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
              fallback={fallback}
              roleLabel={roleLabel}
              adminBasePath={adminBasePath}
              logoutRedirectTo={logoutRedirectTo}
              showProfile={showProfile}
              onPasswordChange={() => setPasswordDialogOpen(true)}
            />
          </div>
        </div>
      </header>

      <AdminPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} hideTrigger />
    </>
  );
}

type AdminHeaderProfileMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  fallback: string;
  roleLabel: string;
  adminBasePath: string;
  logoutRedirectTo: string;
  showProfile: boolean;
  onPasswordChange: () => void;
};

function AdminHeaderProfileMenu({
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  adminBasePath,
  logoutRedirectTo,
  showProfile,
  onPasswordChange,
}: AdminHeaderProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-strong sm:gap-3"
          aria-label={`${displayName} · ${roleLabel}, 계정 메뉴 열기`}
        >
          <Avatar appearance="bordered" className="size-8 sm:size-9">
            <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
            <AvatarFallback appearance="success">{fallback}</AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block max-w-20 truncate text-xs font-semibold text-ink sm:max-w-40 sm:text-sm">{displayName}</span>
            <span className="mt-0.5 flex items-center gap-1 text-2xs font-medium text-success-ink sm:text-caption">
              <ShieldCheck className="size-3" aria-hidden="true" />
              {roleLabel}
            </span>
          </span>
          <ChevronDown className="hidden size-3.5 text-ink-faint sm:block" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-62.5">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs font-normal text-ink-subtle">{email}</p>
          <p className="text-2xs font-medium uppercase text-ink-subtle">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showProfile ? <DropdownMenuItem asChild>
          <Link href={`${adminBasePath}/profile`}>
            <UserRound className="size-4" />
            프로필 수정
          </Link>
        </DropdownMenuItem> : null}
        <DropdownMenuItem onSelect={onPasswordChange}>
          <KeyRound className="size-4" />
          비밀번호 변경
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home className="size-4" />
            홈으로 가기
          </Link>
        </DropdownMenuItem>
        <form action={logoutAction}>
          <input type="hidden" name="redirectTo" value={logoutRedirectTo} />
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              로그아웃
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
