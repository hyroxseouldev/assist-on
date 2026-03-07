"use client";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AdminProfileRailMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  fallback: string;
  roleLabel: string;
  tenantBasePath: string;
};

export function AdminProfileRailMenu({
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  tenantBasePath,
}: AdminProfileRailMenuProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-md bg-zinc-100 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                aria-label="계정 메뉴 열기"
              >
                <Avatar className="size-7">
                  <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">계정 메뉴</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" side="right" className="w-[250px]">
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs font-normal text-zinc-500">{email}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{roleLabel}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`${tenantBasePath}/admin/profile`}>
              <UserRound className="size-4" />
              프로필 수정
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)}>
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
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <LogOut className="size-4" />
                로그아웃
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} hideTrigger />
    </>
  );
}
