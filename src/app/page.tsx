import type { Metadata } from "next";
import { Bebas_Neue, Noto_Sans_KR } from "next/font/google";

import { HyroxCoachLanding } from "@/components/landing/hyrox-coach-landing";

const headingFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

const bodyFont = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "하이록스 코치 운영 OS | Assist On",
  description:
    "하이록스 프로그램을 운영하는 코치를 위한 단일 목적 랜딩 페이지. 운영 복잡도 감소, 회원 성과 가시화, 코치 수익화 지원.",
};

export default function LandingHomePage() {
  return (
    <div className={`${headingFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)]`}>
      <HyroxCoachLanding />
    </div>
  );
}
