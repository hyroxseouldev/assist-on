import type { Metadata } from "next";

import { ClyrtrainingPlatformLanding } from "@/components/landing/clyrtraining-platform-landing";
import { PublicHeader } from "@/components/navigation/public-header";

export const metadata: Metadata = {
  title: "Clyrtraining | Tenant Store & Booking Platform",
  description: "테넌트 랜딩, 스토어, 예약 서비스를 하나의 유저 흐름으로 연결하는 Clyrtraining 플랫폼 소개 페이지.",
};

export default function LandingHomePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f7f3_0%,#ffffff_30%,#eff4ff_100%)] font-sans text-zinc-950">
      <PublicHeader />
      <ClyrtrainingPlatformLanding />
    </div>
  );
}
