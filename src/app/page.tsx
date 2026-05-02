import type { Metadata } from "next";

import { ClyrBrandLanding } from "@/components/landing/clyr-brand-landing";

export const metadata: Metadata = {
  title: "clyr | 코치를 위한 커스텀 앱 플랫폼",
  description: "코치와 센터를 위한 커스텀 트레이닝 앱 플랫폼 clyr의 브랜드 랜딩 페이지.",
};

export default function LandingHomePage() {
  return <ClyrBrandLanding />;
}
