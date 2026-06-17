"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PublicProfileMenuProps = {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  fallback: string;
  accountActionHref: string;
  accountActionLabel: "대시보드";
  logoutRedirectTo?: string;
};

export function PublicProfileMenu({
  email,
  displayName,
  avatarUrl,
  fallback,
  accountActionHref,
  accountActionLabel,
  logoutRedirectTo,
}: PublicProfileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-1 py-1 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          aria-label="프로필 메뉴 열기"
        >
          <Avatar className="size-8 border border-zinc-200/80">
            <AvatarImage src={avatarUrl ?? undefined} alt={`${displayName} 프로필`} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <ChevronDown className={`size-3.5 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[240px]">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
          <p className="truncate text-xs font-normal text-zinc-500">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={accountActionHref}>
            <LayoutDashboard className="size-4" />
            {accountActionLabel}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={logoutAction} className="w-full">
            <input type="hidden" name="redirectTo" value={logoutRedirectTo ?? ""} />
            <button type="submit" className="flex w-full items-center gap-2 text-left">
              <LogOut className="size-4" />
              로그아웃
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
