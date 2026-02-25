"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HomeSidebarProps = {
  displayName: string;
  email: string;
  avatarUrl?: string;
  isAdmin: boolean;
};

export function HomeSidebar({ displayName, email, avatarUrl, isAdmin }: HomeSidebarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAbout = pathname === "/about";
  const isProfile = pathname === "/profile";
  const fallback = displayName.slice(0, 1).toUpperCase();
  const navItemClass = "block rounded-md px-3 py-2 text-sm transition-colors";
  const activeClass = "bg-emerald-600 text-white";
  const inactiveClass = "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <Card className="h-full lg:min-h-[540px]">
      <CardHeader>
        <CardTitle className="text-lg">Assist On</CardTitle>
        <CardDescription>오늘의 훈련과 팀 기준</CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3 rounded-md bg-zinc-50 p-4">
          <Avatar size="lg" className="size-12">
            <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-900">{displayName}</p>
            <p className="truncate text-xs text-zinc-500">{email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          <Link href="/" className={cn(navItemClass, isHome ? activeClass : inactiveClass)}>
            홈
          </Link>
          <Link href="/about" className={cn(navItemClass, isAbout ? activeClass : inactiveClass)}>
            About
          </Link>
          <Link href="/profile" className={cn(navItemClass, isProfile ? activeClass : inactiveClass)}>
            Profile
          </Link>
        </nav>
        {isAdmin ? (
          <Link href="/admin" className={cn(navItemClass, inactiveClass, "mt-3")}>
            Admin
          </Link>
        ) : null}
        <div className="min-h-4 flex-1" />
        <form action={logoutAction}>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start font-normal text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            type="submit"
          >
            로그아웃
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
