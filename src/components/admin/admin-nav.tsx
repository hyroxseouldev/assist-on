"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/profile", label: "프로필 수정" },
  { href: "/admin/branding", label: "브랜딩" },
  { href: "/admin/program", label: "프로그램 관리" },
  { href: "/admin/store/products", label: "스토어 상품" },
  { href: "/admin/store/orders", label: "스토어 주문" },
  { href: "/admin/about", label: "About 콘텐츠" },
  { href: "/admin/sessions", label: "세션 캘린더" },
  { href: "/admin/notices", label: "공지사항" },
  { href: "/admin/community", label: "커뮤니티 관리" },
  { href: "/admin/offline-classes", label: "오프라인 클래스" },
  { href: "/admin/users", label: "멤버십 관리" },
  { href: "/admin/all-users", label: "전체 유저 조회" },
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
                  ? "bg-zinc-900 text-white"
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
