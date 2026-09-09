import type { Metadata } from "next";

import { PlatformLanding } from "@/components/landing/platform-landing";
import type { TenantMembershipRow } from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "clyrtraining | 체육관과 코치를 위한 코칭 워크스페이스",
  description: "프로그램, 회원 관리, 운동 기록과 코치 피드백을 한곳에서. 개인 코치부터 체육관과 트레이닝 브랜드까지, clyrtraining으로 매일의 운영을 연결하세요.",
};

export default async function HomePage() {
  const { supabase, user } = await getAuthenticatedUser();
  let isLoggedIn = false;

  if (user) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    isLoggedIn = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
  }

  return <PlatformLanding isLoggedIn={isLoggedIn} />;
}
