"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BookText,
  CalendarDays,
  FileText,
  Gauge,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const activeItems: NavItem[] = [
  { href: "/admin/notices", label: "공지사항", icon: FileText },
  { href: "/admin/sessions", label: "세션 캘린더", icon: CalendarDays },
  { href: "/admin/community", label: "커뮤니티 게시글", icon: BookText },
  { href: "/admin/report", label: "커뮤니티 신고", icon: AlertTriangle },
  { href: "/admin/workout-records", label: "운동 레코드 리더보드", icon: Gauge },
  { href: "/admin/all-users", label: "전체 유저 조회", icon: Users },
];

const infoItems: NavItem[] = [{ href: "/admin/branding", label: "브랜딩", icon: Store }];

const shopItems: NavItem[] = [
  { href: "/admin/store/products", label: "스토어 상품", icon: Package },
  { href: "/admin/store/orders", label: "스토어 주문", icon: ShoppingCart },
  { href: "/admin/program", label: "프로그램 관리", icon: ScrollText },
];

const pendingItems: NavItem[] = [
  { href: "/admin/offline-classes", label: "오프라인 클래스", icon: CalendarDays, disabled: true },
  { href: "/admin/about", label: "About 콘텐츠", icon: FileText, disabled: true },
];

const legalItems: NavItem[] = [{ href: "/admin/legal-documents", label: "약관", icon: ShieldCheck }];

const accountItems: NavItem[] = [{ href: "/admin/account/deactivated-users", label: "비활성 계정 관리", icon: UserX }];

export function AdminNav() {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";

  const renderMenuItems = (items: NavItem[]) =>
    items.map((item) => {
      const href = `${tenantBasePath}${item.href}`;
      const isActive = pathname === href || pathname.startsWith(`${href}/`);
      const Icon = item.icon;

      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
            <Link href={href}>
              <Icon className="size-4" />
              <span className="block leading-tight">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <nav className="space-y-1">
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">정보</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(infoItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="my-2" />

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">운영 메뉴</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(activeItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="my-2" />

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">상점</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(shopItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="my-2" />

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">약관</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(legalItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="my-2" />

      <SidebarMenu>
        {pendingItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              tooltip={item.label}
              aria-disabled="true"
              className="cursor-not-allowed bg-zinc-50 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-400"
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </SidebarMenuButton>
            <SidebarMenuBadge className="bg-zinc-200 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500">
              준비중
            </SidebarMenuBadge>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <SidebarSeparator className="my-2" />

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">계정관련</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(accountItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </nav>
  );
}
