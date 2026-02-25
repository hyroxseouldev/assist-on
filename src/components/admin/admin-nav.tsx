"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/program", label: "프로그램 정보" },
  { href: "/admin/about", label: "About 콘텐츠" },
  { href: "/admin/sessions", label: "세션 캘린더" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
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
