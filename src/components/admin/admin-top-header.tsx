"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, KeyRound, LogOut, UserRound } from "lucide-react";
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
  tenantSlug: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  fallback: string;
  roleLabel: string;
  tenantBasePath: string;
};

export function AdminTopHeader({
  brandName,
  brandLogoUrl,
  tenantSlug,
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  tenantBasePath,
}: AdminTopHeaderProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:rounded-t-2xl">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="size-8 text-zinc-700" />
            <div className="hidden h-6 w-px bg-zinc-200 md:block" />
            <Link href={`/t/${tenantSlug}/admin`} className="flex min-w-0 items-center gap-2 md:hidden">
              <span className="relative block size-7 overflow-hidden rounded-md border border-zinc-200 bg-white">
                <Image src={brandLogoUrl} alt={`${brandName} 로고`} fill className="object-cover" sizes="28px" />
              </span>
              <span className="truncate text-sm font-semibold text-zinc-900">{brandName}</span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center">
            <AdminHeaderProfileMenu
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
              fallback={fallback}
              roleLabel={roleLabel}
              tenantBasePath={tenantBasePath}
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
  tenantBasePath: string;
  onPasswordChange: () => void;
};

function AdminHeaderProfileMenu({
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  tenantBasePath,
  onPasswordChange,
}: AdminHeaderProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          aria-label="계정 메뉴 열기"
        >
          <Avatar className="size-9">
            <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[250px]">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs font-normal text-zinc-500">{email}</p>
          <p className="text-[10px] font-medium uppercase text-zinc-500">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`${tenantBasePath}/admin/profile`}>
            <UserRound className="size-4" />
            프로필 수정
          </Link>
        </DropdownMenuItem>
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
          <input type="hidden" name="redirectTo" value={tenantBasePath} />
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
