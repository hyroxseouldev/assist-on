import {
  BarChart3,
  Bell,
  CreditCard,
  Dumbbell,
  MessageCircle,
  Store,
} from "lucide-react";

import { Feature43 } from "@/components/feature43";
import { Footer2 } from "@/components/footer2";
import { HomeContact } from "@/components/home-contact";
import { HomeFaq } from "@/components/home-faq";
import { Hero115 } from "@/components/hero115";
import { Logos18 } from "@/components/logos18";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { Navbar1 } from "@/components/navbar1";
import { Pricing2 } from "@/components/pricing2";
import type { TenantMembershipRow } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  let isLoggedIn = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: memberships } = await supabase
        .from("tenant_memberships")
        .select("tenant_id, role, tenants:tenant_id(slug)")
        .eq("user_id", user.id)
        .returns<TenantMembershipRow[]>();

      isLoggedIn = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    }
  } catch {
    isLoggedIn = false;
  }

  return (
    <main className="flex w-full flex-col">
      <Navbar1 isLoggedIn={isLoggedIn} />
      <Hero115
        heading={
          <>
            코칭 프로그램 운영을 더 쉽게 만들고, 더 오래 지속하세요
          </>
        }
        description={
          <>
            신청, 결제, 회원 기록, 피드백까지 흩어진 운영 흐름을 한곳에서 정리하세요.
            <br />
            개인 코치의 첫 프로그램부터 브랜드 팀의 확장까지 같은 시스템으로 관리할 수 있습니다.
          </>
        }
        buttons={{
          primary: {
            text: "도입 문의하기",
            url: "#contact",
          },
          secondary: {
            text: "대시보드 보기",
            url: "/login",
          },
        }}
        byline="✨ Built for coaching teams ready to scale"
      />
      <ScrollReveal>
        <Logos18
          heading="이미 현장에서 운영 중인 코칭 앱"
          description="개인 코치부터 트레이닝 브랜드까지, 실제 프로그램 운영 흐름에 맞춰 CLYR를 사용하고 있습니다."
          logos={[
            {
              src: "/partners/xon-training-logo.png",
              alt: "XON Training",
              className: "h-8 w-auto",
              href: "https://www.instagram.com/xon_training",
            },
            {
              src: "/partners/amor-lab-logo.png",
              alt: "AMOR LAB",
              className: "h-7 w-auto",
              href: "https://www.amorlab.kr/",
            },
          ]}
        />
      </ScrollReveal>
      <ScrollReveal>
        <Feature43
          id="feature"
          heading={
            <>
              운영은 가볍게, 코칭은 더 꾸준하게
            </>
          }
          description="입금 확인부터 피드백과 코칭 기록까지, 프로그램 운영 흐름을 한곳에서 정리하세요."
          features={[
            {
              icon: <CreditCard className="size-6" />,
              title: "입출금과 환불 관리",
              description:
                "입금, 환불, 정산 상태를 한눈에 확인하고 결제 추적 부담을 줄입니다.",
            },
            {
              icon: <MessageCircle className="size-6" />,
              title: "하루 한 번 피드백 루틴",
              description:
                "매일 남긴 피드백을 모아보고 미답변 항목을 놓치지 않습니다.",
            },
            {
              icon: <BarChart3 className="size-6" />,
              title: "코칭 데이터 축적",
              description:
                "회원 기록과 피드백 내역을 쌓아 다음 코칭에 활용합니다.",
            },
            {
              icon: <Dumbbell className="size-6" />,
              title: "프로그램 구조화",
              description:
                "운동 노하우를 주차별 세션과 콘텐츠로 정리합니다.",
            },
            {
              icon: <Bell className="size-6" />,
              title: "공지와 콘텐츠 운영",
              description:
                "공지, 영상, 프로그램 안내를 앱 안에 모아 전달합니다.",
            },
            {
              icon: <Store className="size-6" />,
              title: "브랜드 앱 경험",
              description:
                "프로그램과 코치 정보를 담아 내 브랜드 경험으로 운영합니다.",
            },
          ]}
          buttons={{}}
        />
      </ScrollReveal>
      <ScrollReveal>
        <Pricing2
          id="pricing"
          heading="월 활성 회원 수에 맞춰 시작하고, 커지면 정액제로 전환하세요"
          description="처음에는 무료로 작게 시작하고, 월 활성 회원 10명까지는 Growth로 운영하세요. 11명 이상부터는 Partner 플랜으로 확장할 수 있습니다."
          showBillingToggle={false}
          plans={[
            {
              name: "Starter",
              description: "처음 시작하는 개인 코치를 위한 무료 플랜",
              monthlyPrice: "무료",
              yearlyPrice: "무료",
              monthlyPeriod: "",
              yearlyPeriod: "",
              features: [
                "월 활성 회원 최대 3명 포함",
                "프로그램 1개",
                "기본 프로그램 관리",
                "회원 기록/피드백 확인",
                "마케팅 페이지 제공",
                "결제/멤버십 고급 관리 미지원",
              ],
            },
            {
              name: "Growth",
              description: "월 활성 회원 10명까지 운영하는 개인 코치와 소규모 팀",
              monthlyPrice: "9.9만원",
              yearlyPrice: "9.9만원",
              monthlyPeriod: "/월",
              yearlyPeriod: "/월",
              features: [
                "월 활성 회원 최대 10명 포함",
                "월정액으로 안정적인 운영",
                "프로그램 최대 5개",
                "결제/멤버십 관리",
                "피드백 관리 대시보드",
                "코치 계정 추가",
              ],
              highlighted: true,
            },
            {
              name: "Partner",
              description: "월 활성 회원 11명 이상을 운영하는 센터와 브랜드 파트너",
              monthlyPrice: "39.9만원",
              yearlyPrice: "39.9만원",
              monthlyPeriod: "/월",
              yearlyPeriod: "/월",
              features: [
                "월 활성 회원 11~50명 포함",
                "Growth 이후 정액제 전환",
                "프로그램 최대 10개",
                "복수 코치/운영자 계정",
                "고급 브랜드 설정",
                "도입 세팅 지원",
              ],
            },
            {
              name: "Enterprise",
              description: "50명 초과 운영 또는 커스텀 앱이 필요한 팀",
              monthlyPrice: "별도 협의",
              yearlyPrice: "별도 협의",
              monthlyPeriod: "",
              yearlyPeriod: "",
              features: [
                "월 활성 회원 50명 초과 운영",
                "커스텀 앱 제공",
                "복수 코치/운영자 계정",
                "고급 브랜드 설정",
                "운영 구조 맞춤 설계",
                "도입 세팅 지원",
              ],
            },
          ]}
        />
      </ScrollReveal>
      <ScrollReveal>
        <HomeFaq id="faq" />
      </ScrollReveal>
      <ScrollReveal>
        <HomeContact id="contact" />
      </ScrollReveal>
      <Footer2 />
    </main>
  );
}
