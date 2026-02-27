"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/program", label: "프로그램 정보" },
  { href: "/admin/about", label: "About 콘텐츠" },
  { href: "/admin/sessions", label: "세션 캘린더" },
  { href: "/admin/notices", label: "공지사항" },
  { href: "/admin/community", label: "커뮤니티 관리" },
  { href: "/admin/offline-classes", label: "오프라인 클래스" },
  { href: "/admin/invitations", label: "초대 관리" },
  { href: "/admin/users", label: "유저 관리" },
];

export function AdminNav() {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const href = `${tenantBasePath}${item.href}`;
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-emerald-600 text-white"
                : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
