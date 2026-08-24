"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BadgePercent,
  BadgeCheck,
  BookText,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileText,
  FileSearch,
  Gauge,
  HandCoins,
  House,
  MapPin,
  MessageSquareText,
  Package,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  UserX,
  Youtube,
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
  { href: "/admin/branding", label: "브랜딩/입금정보", icon: Store },
  { href: "/admin/coaches", label: "코치 관리", icon: Users },
  { href: "/admin/locations", label: "지점 관리", icon: MapPin },
  { href: "/admin/notices", label: "공지사항", icon: FileText },
  { href: "/admin/youtube", label: "유튜브", icon: Youtube },
  { href: "/admin/offline-classes", label: "오프라인 클래스", icon: CalendarDays },
  { href: "/admin/partner-discounts", label: "제휴 할인 코드", icon: BadgePercent },
  { href: "/admin/users", label: "유저 정보 관리", icon: Users },
];

const homeItems: NavItem[] = [{ href: "/admin", label: "홈", icon: House }];

const coachItems: NavItem[] = [
  { href: "/admin/sessions", label: "프로그램 운동 입력", icon: Dumbbell },
  { href: "/admin/session-reviews", label: "프로그램 피드백", icon: MessageSquareText },
  { href: "/admin/workout-records", label: "기록 랭킹", icon: Gauge },
  { href: "/admin/membership-grants", label: "멤버쉽 부여", icon: HandCoins },
  { href: "/admin/memberships", label: "멤버쉽 현황", icon: BadgeCheck },
  { href: "/admin/program-applications", label: "프로그램 신청 내역 조회", icon: FileSearch },
];

const betaItems: NavItem[] = [
  { href: "/admin/community", label: "커뮤니티", icon: BookText },
  { href: "/admin/report", label: "신고", icon: AlertTriangle },
  { href: "/admin/booking-services", label: "예약 서비스", icon: CalendarDays, badge: "beta", exact: true },
  { href: "/admin/booking-services/orders", label: "예약 서비스 주문", icon: CalendarDays, badge: "beta" },
];

const shopItems: NavItem[] = [
  { href: "/admin/store/products", label: "스토어 상품", icon: Package },
  { href: "/admin/store/orders", label: "주문", icon: ShoppingCart },
  { href: "/admin/store/subscriptions", label: "구독", icon: RefreshCcw },
  { href: "/admin/store/guest-orders", label: "주문 내역", icon: ClipboardList, exact: true },
  { href: "/admin/store/guest-orders/revenue", label: "매출 조회", icon: BarChart3 },
  { href: "/admin/coupons", label: "쿠폰 관리", icon: ClipboardList },
  { href: "/admin/program", label: "프로그램", icon: ScrollText },
];

const adminItems: NavItem[] = [
  { href: "/admin/account/deactivated-users", label: "비활성 계정 관리", icon: UserX },
  { href: "/admin/legal-documents", label: "약관", icon: ShieldCheck },
];

type AdminNavProps = {
  isPlatformAdmin: boolean;
  tenantRole: "owner" | "coach" | "member" | null;
};

export function AdminNav({ isPlatformAdmin, tenantRole }: AdminNavProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const isDevelopmentFlavor = process.env.NEXT_PUBLIC_MODE === "development";
  const isCoachOnly = tenantRole === "coach" && !isPlatformAdmin;
  const activePathname = pathname.replace(/^\/t\/[^/]+\/admin(?=\/|$)/, "/admin");

  const renderMenuItems = (items: NavItem[]) =>
    items.map((item) => {
      const href = item.href;
      const isRootAdmin = item.href === "/admin";
      const isActive = (isRootAdmin || item.exact) ? activePathname === href : activePathname === href || activePathname.startsWith(`${href}/`);
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
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(homeItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator className="my-2" />

      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-1">코치</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{renderMenuItems(coachItems)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isCoachOnly ? null : (
        <>
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
        </>
      )}

      {isDevelopmentFlavor && !isCoachOnly ? (
        <>
          <SidebarSeparator className="my-2" />

          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-1">Beta</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderMenuItems(betaItems)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

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
