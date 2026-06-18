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

export default function HomePage() {
  return (
    <main className="flex w-full flex-col">
      <Navbar1 />
      <Hero115
        heading={
          <>
            코칭은 어렵지 않습니다
            <br />
            운동 프로그램 운영을 더 쉽게 시작하세요
          </>
        }
        description="당신만의 운동 프로그램을 만들고, 회원 관리부터 운영까지 한곳에서 시작하세요."
        buttons={{
          primary: {
            text: "도입 문의하기",
            url: "#contact",
          },
          secondary: {
            text: "대시보드 보기",
            url: "/t/demo/tenant/login",
          },
        }}
        byline="브랜드에 맞는 코칭 앱으로 프로그램 운영 경험을 정리하세요"
      />
      <ScrollReveal>
        <Logos18
          heading="Trusted by coaches and teams"
          logos={[
            {
              src: "/partners/xon-training-logo.png",
              alt: "XON Training",
              className: "h-8 w-auto",
              href: "#",
            },
            {
              src: "/partners/amor-lab-logo.png",
              alt: "AMOR LAB",
              className: "h-7 w-auto",
              href: "#",
            },
          ]}
        />
      </ScrollReveal>
      <ScrollReveal>
        <Feature43
          id="feature"
          heading={
            <>
              Turn your coaching know-how
              <br />
              into a scalable program
            </>
          }
          features={[
            {
              icon: <Dumbbell className="size-5" />,
              title: "프로그램을 구조화하세요",
              description:
                "흩어진 운동 노하우를 주차별 프로그램, 세션, 운동 콘텐츠로 정리해 회원이 따라갈 수 있는 코칭 상품으로 만드세요.",
            },
            {
              icon: <CreditCard className="size-5" />,
              title: "회원 모집과 결제를 한 번에",
              description:
                "프로그램 신청, 멤버십 부여, 결제, 할인 코드까지 코칭 상품 판매에 필요한 흐름을 한곳에서 관리하세요.",
            },
            {
              icon: <MessageCircle className="size-5" />,
              title: "피드백은 하루에 한 번이면 충분하게",
              description:
                "메신저마다 흩어진 질문과 후기를 모아보고, 미답변 피드백을 우선 확인해 소통 피로를 줄이세요.",
            },
            {
              icon: <BarChart3 className="size-5" />,
              title: "선수 기록을 코칭 데이터로",
              description:
                "완료 여부, 운동 기록, 랭킹, 변화 추이를 확인해 감으로만 하던 코칭을 데이터 기반으로 이어가세요.",
            },
            {
              icon: <Bell className="size-5" />,
              title: "콘텐츠와 공지를 한곳에서",
              description:
                "공지사항, 유튜브 콘텐츠, 프로그램 안내를 앱 안에 모아 회원이 필요한 정보를 놓치지 않게 하세요.",
            },
            {
              icon: <Store className="size-5" />,
              title: "브랜드 운영까지 확장하세요",
              description:
                "코치 프로필, 지점, 오프라인 클래스, 법적 문서까지 정리해 개인 코칭을 신뢰도 있는 브랜드 경험으로 확장하세요.",
            },
          ]}
          buttons={{}}
        />
      </ScrollReveal>
      <ScrollReveal>
        <HomeFaq id="faq" />
      </ScrollReveal>
      <ScrollReveal>
        <Pricing2
          id="pricing"
          heading="Pricing"
          description="코칭 프로그램 규모와 운영 방식에 맞춰 필요한 플랜을 선택하세요."
          plans={[
            {
              name: "Free",
              description: "작게 시작하는 개인 코치를 위한 플랜",
              monthlyPrice: "0원",
              yearlyPrice: "0원",
              monthlyPeriod: "",
              yearlyPeriod: "",
              features: [
                "프로그램 1개",
                "최대 회원 5명",
                "기본 프로그램 관리",
                "기본 기록/피드백 확인",
                "커스텀 앱 미지원",
                "코치 계정 추가 미지원",
              ],
              button: {
                text: "무료로 시작하기",
                url: "#",
              },
            },
            {
              name: "Pro",
              description: "온라인 코칭을 본격적으로 운영하는 코치를 위한 플랜",
              monthlyPrice: "10만원",
              yearlyPrice: "100만원",
              monthlyPeriod: "/월",
              yearlyPeriod: "/년",
              features: [
                "프로그램 최대 5개",
                "최대 회원 50명",
                "마케팅 페이지 제공",
                "코치 계정 추가",
                "결제/멤버십 관리",
                "피드백 관리 대시보드",
              ],
              button: {
                text: "Pro 시작하기",
                url: "#",
              },
              highlighted: true,
            },
            {
              name: "Enterprise",
              description: "브랜드 단위 운영과 커스텀 앱이 필요한 팀을 위한 플랜",
              monthlyPrice: "문의하기",
              yearlyPrice: "문의하기",
              monthlyPeriod: "",
              yearlyPeriod: "",
              features: [
                "프로그램 최대 10개",
                "회원 수 무제한",
                "커스텀 앱 제공",
                "고급 브랜드 설정",
                "복수 코치/운영자 계정",
                "도입 세팅 지원",
              ],
              button: {
                text: "문의하기",
                url: "#",
              },
            },
          ]}
        />
      </ScrollReveal>
      <ScrollReveal>
        <HomeContact id="contact" />
      </ScrollReveal>
      <Footer2 />
    </main>
  );
}
