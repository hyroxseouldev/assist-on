"use client";

import Link from "next/link";
import { ChevronDown, KeyRound, UserRound } from "lucide-react";
import { useState } from "react";

import { AdminPasswordDialog } from "@/components/admin/admin-password-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminProfileMenuProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  fallback: string;
  roleLabel: string;
  tenantBasePath: string;
};

export function AdminProfileMenu({
  displayName,
  email,
  avatarUrl,
  fallback,
  roleLabel,
  tenantBasePath,
}: AdminProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full rounded-md bg-zinc-50 p-3 text-left transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            aria-label="프로필 메뉴 열기"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="lg" className="size-11">
                  <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
                  <p className="truncate text-xs text-zinc-500">{email}</p>
                </div>
              </div>
              <ChevronDown
                className={`size-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-900">
                {roleLabel}
              </Badge>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-[260px]">
          <DropdownMenuLabel>내 계정</DropdownMenuLabel>
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
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminPasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} hideTrigger />
    </>
  );
}
