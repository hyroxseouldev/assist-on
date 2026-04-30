"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BookText,
  CalendarDays,
  FileText,
  Gauge,
  House,
  MessageSquare,
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
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
  disabled?: boolean;
  indent?: boolean;
};

const activeItems: NavItem[] = [
  { href: "/admin/notices", label: "공지사항", icon: FileText },
  { href: "/admin/sessions", label: "운동 입력", icon: CalendarDays },
  { href: "/admin/session-reviews", label: "운동 후기", icon: MessageSquare },
  { href: "/admin/community", label: "커뮤니티", icon: BookText },
  { href: "/admin/report", label: "신고", icon: AlertTriangle },
  { href: "/admin/workout-records", label: "리더보드", icon: Gauge },
  { href: "/admin/all-users", label: "유저 정보 관리", icon: Users },
];

const betaItems: NavItem[] = [
  { href: "/admin/booking-services", label: "예약 서비스", icon: CalendarDays, badge: "beta", exact: true },
  { href: "/admin/booking-services/orders", label: "예약 서비스 주문", icon: CalendarDays, badge: "beta" },
];

const infoItems: NavItem[] = [
  { href: "/admin", label: "홈", icon: House },
  { href: "/admin/branding", label: "브랜딩/입금정보", icon: Store },
  { href: "/admin/coaches", label: "코치 관리", icon: Users },
];

const shopItems: NavItem[] = [
  { href: "/admin/store/products", label: "스토어 상품", icon: Package },
  { href: "/admin/store/orders", label: "주문", icon: ShoppingCart },
  { href: "/admin/program", label: "프로그램", icon: ScrollText },
];

const pendingItems: NavItem[] = [
  { href: "/admin/offline-classes", label: "오프라인 클래스", icon: CalendarDays, disabled: true },
  { href: "/admin/about", label: "About 콘텐츠", icon: FileText, disabled: true },
];

const adminItems: NavItem[] = [
  { href: "/admin/account/deactivated-users", label: "비활성 계정 관리", icon: UserX },
  { href: "/admin/legal-documents", label: "약관", icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isDevelopmentFlavor = process.env.NEXT_PUBLIC_MODE === "development";
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";

  const renderMenuItems = (items: NavItem[]) =>
    items.map((item) => {
      const href = `${tenantBasePath}${item.href}`;
      const isRootAdmin = item.href === "/admin";
      const isActive = (isRootAdmin || item.exact) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
      const Icon = item.icon;

      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
            <Link
              href={href}
              className={item.indent ? "pl-6" : undefined}
              onClick={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
              }}
            >
              <Icon className="size-4" />
              <span className="block leading-tight">{item.label}</span>
            </Link>
          </SidebarMenuButton>
          {item.badge ? (
            <SidebarMenuBadge className="bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-600">
              {item.badge}
            </SidebarMenuBadge>
          ) : null}
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

      {isDevelopmentFlavor ? (
        <>
          <SidebarSeparator className="my-2" />

          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-1">Beta</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderMenuItems(betaItems)}</SidebarMenu>
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
            <SidebarGroupLabel className="px-1">관리자 메뉴</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderMenuItems(adminItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </nav>
  );
}
