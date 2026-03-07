"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
};

const activeItems: NavItem[] = [
  { href: "/admin/notices", label: "공지사항" },
  { href: "/admin/sessions", label: "세션 캘린더" },
  { href: "/admin/community", label: "커뮤니티 게시글" },
  { href: "/admin/report", label: "커뮤니티 신고" },
  { href: "/admin/workout-records", label: "운동 레코드 리더보드" },
  { href: "/admin/all-users", label: "전체 유저 조회" },
];

const infoItems: NavItem[] = [{ href: "/admin/branding", label: "브랜딩" }];

const shopItems: NavItem[] = [
  { href: "/admin/store/products", label: "스토어 상품" },
  { href: "/admin/store/orders", label: "스토어 주문" },
  { href: "/admin/program", label: "프로그램 관리" },
];

const pendingItems: NavItem[] = [
  { href: "/admin/offline-classes", label: "오프라인 클래스", disabled: true },
  { href: "/admin/about", label: "About 콘텐츠", disabled: true },
];

const legalItems: NavItem[] = [{ href: "/admin/legal-documents", label: "약관" }];

export function AdminNav() {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";

  return (
    <nav className="space-y-1">
      <p className="px-1 pb-1 text-xs font-medium tracking-wide text-zinc-500">정보</p>

      {infoItems.map((item) => {
        const href = `${tenantBasePath}${item.href}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <span className="block leading-tight">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-3 border-t border-zinc-200" />
      <p className="px-1 pb-1 text-xs font-medium tracking-wide text-zinc-500">운영 메뉴</p>

      {activeItems.map((item) => {
        const href = `${tenantBasePath}${item.href}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <span className="block leading-tight">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-3 border-t border-zinc-200" />
      <p className="px-1 pb-1 text-xs font-medium tracking-wide text-zinc-500">상점</p>

      {shopItems.map((item) => {
        const href = `${tenantBasePath}${item.href}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <span className="block leading-tight">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-3 border-t border-zinc-200" />
      <p className="px-1 pb-1 text-xs font-medium tracking-wide text-zinc-500">약관</p>

      {legalItems.map((item) => {
        const href = `${tenantBasePath}${item.href}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <span className="block leading-tight">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-3 border-t border-zinc-200" />

      {pendingItems.map((item) => (
        <div
          key={item.href}
          aria-disabled="true"
          className="flex cursor-not-allowed items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-400"
        >
          <span>{item.label}</span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500">준비중</span>
        </div>
      ))}
    </nav>
  );
}
