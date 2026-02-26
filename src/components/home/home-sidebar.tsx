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
  const isNotices = pathname === "/notices";
  const isCommunity = pathname.startsWith("/community");
  const isOfflineClasses = pathname === "/offline-classes";
  const fallback = displayName.slice(0, 1).toUpperCase();
  const navItemClass = "block rounded-md px-3 py-2 text-sm transition-colors";
  const activeClass = "bg-emerald-600 text-white";
  const inactiveClass = "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Assist On</CardTitle>
        <CardDescription>오늘의 훈련 흐름과 팀 기준을 한눈에 확인해 보세요.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <nav className="space-y-1">
          <Link href="/" className={cn(navItemClass, isHome ? activeClass : inactiveClass)}>
            홈
          </Link>
          <Link href="/about" className={cn(navItemClass, isAbout ? activeClass : inactiveClass)}>
            About
          </Link>
          <Link href="/notices" className={cn(navItemClass, isNotices ? activeClass : inactiveClass)}>
            공지사항
          </Link>
          <Link href="/community" className={cn(navItemClass, isCommunity ? activeClass : inactiveClass)}>
            커뮤니티
          </Link>
          <Link href="/offline-classes" className={cn(navItemClass, isOfflineClasses ? activeClass : inactiveClass)}>
            오프라인 클래스
          </Link>
        </nav>

        <div className="flex-1" />

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-3 rounded-md bg-zinc-50 p-3">
            <Avatar size="lg" className="size-11">
              <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{email}</p>
            </div>
          </div>

          <Link href="/profile" className={cn(navItemClass, isProfile ? activeClass : inactiveClass)}>
            Profile
          </Link>
          {isAdmin ? (
            <Link href="/admin" className={cn(navItemClass, inactiveClass)}>
              Admin
            </Link>
          ) : null}
          <form action={logoutAction}>
            <Button variant="outline" className="h-10 w-full justify-start" type="submit">
              로그아웃
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
