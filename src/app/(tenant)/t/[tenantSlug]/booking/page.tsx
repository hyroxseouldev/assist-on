import type { Metadata } from "next";
import { DemoLandingPage, type DemoLandingPageContent } from "@/components/landing/demo-landing-page";
import { getFeaturedBookingServiceByTenantSlug } from "@/lib/booking/server";
import { getTenantBookingServicePath } from "@/lib/booking/paths";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: "예약 서비스",
    description: "예약 서비스 안내와 진입 흐름을 확인할 수 있는 페이지",
  });
}

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const featuredService = await getFeaturedBookingServiceByTenantSlug(tenantSlug);
  const primaryHref = featuredService ? getTenantBookingServicePath(tenantSlug, featuredService.id) : "#apply";

  const content: DemoLandingPageContent = {
    badge: "HYROX Simulation",
    hero: {
      title: "하이록스 시뮬레이션",
      subtitle: "레이스를 앞두고 무엇부터 준비해야 할지 모르겠다면",
      description: [
        "가장 확실한 방법은 실전처럼 경험해보는 것입니다.",
        "지금 내 위치를 확인하고 레이스를 전략적으로 준비하세요.",
      ],
      primaryCta: {
        label: "시뮬레이션 예약하기",
        href: primaryHref,
      },
      secondaryNote: "실전 흐름 점검부터 코치 분석까지 한 번에 이어집니다.",
      highlights: [
        {
          eyebrow: "Why now",
          title: "레이스 전에 가장 확실한 준비",
          description: "실전과 유사한 흐름 안에서 현재 위치를 먼저 확인하면, 훈련과 페이스 전략이 선명해집니다.",
        },
        {
          eyebrow: "What you get",
          title: "체험이 아닌 분석 중심 피드백",
          description: "구간별 약점, 페이스 전략, 다음 훈련 방향까지 이어지는 예약 서비스 데모 랜딩입니다.",
          emphasized: true,
        },
      ],
    },
    problem: {
      title: "이런 고민, 해보셨나요?",
      description: "하이록스는 단순한 체력이 아니라 전략의 싸움입니다. 막연한 준비만으로는 레이스에서 원하는 결과를 만들기 어렵습니다.",
      points: ["이 정도 페이스면 괜찮을까?", "내 체력으로 완주 가능할까?", "무엇을 보완해야 할지 모르겠다."],
    },
    solution: {
      title: "그래서, 시뮬레이션이 필요합니다",
      description: "하이록스 시뮬레이션은 실전과 가장 가까운 환경에서 내 현재 상태를 정확하게 확인하는 과정입니다.",
      points: ["실제 경기 흐름 기반 구성", "구간별 체력 및 페이스 체크", "나만의 문제 포인트 발견"],
    },
    value: {
      title: "단순 체험이 아닙니다",
      description: "시뮬레이션 이후 전문 코치가 직접 분석하고 개선 방향을 제시합니다. 막연한 운동이 아니라 결과를 위한 준비로 바뀌는 지점입니다.",
      points: ["약점 구간 명확화", "페이스 전략 설계", "훈련 방향 구체화"],
      closing: "코치의 해석이 더해져야 현재 기록이 다음 결과로 이어집니다.",
    },
    outcome: {
      title: "시뮬레이션 이후, 이렇게 달라집니다",
      points: [
        "내가 어디서 무너지는지 알게 됩니다.",
        "어떻게 준비해야 하는지 명확해집니다.",
        "레이스에 대한 불안이 확신으로 바뀝니다.",
      ],
      closing: "이제는 감이 아닌 전략으로 준비하세요.",
    },
    cta: {
      eyebrow: "Apply Now",
      title: "레이스 전에, 이미 한 번 경험하세요",
      description: "하이록스 시뮬레이션으로 당신의 레이스를 완성하세요. 다음 단계에서는 이 영역에 실제 예약 신청 폼이나 슬롯 선택 UI를 연결하면 됩니다.",
      primaryCta: {
        label: "시뮬레이션 예약하기",
        href: primaryHref,
      },
      alternatives: ["지금 내 실력 확인하기", "레이스 준비 시작하기", "시뮬레이션 예약하기"],
    },
  };

  return <DemoLandingPage content={content} />;
}
