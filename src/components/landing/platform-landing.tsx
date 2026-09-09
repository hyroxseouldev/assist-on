import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, CreditCard, Instagram, Mail, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/contact";
import { LANDING_METRICS } from "@/lib/landing/public-metrics";

import { PlatformContactForm } from "./platform-contact-form";
import styles from "./platform-landing.module.css";

const container = "mx-auto w-full max-w-[1120px] px-6 sm:px-10";
const section = `${container} py-20 sm:py-28 lg:py-36`;
const primary = "h-12 rounded-full bg-[#4e70dc] px-6 text-sm font-medium text-white hover:bg-[#4161c8]";
const secondary = "h-12 rounded-full border border-white/15 bg-transparent px-6 text-sm text-zinc-200 hover:bg-white/5 hover:text-white";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 sm:text-xs">{children}</p>;
}

const features = [
  { icon: CalendarDays, title: "노하우는 프로그램이 되고", description: "주차별 운동과 세션을 정리해 전달하세요. 매번 파일을 다시 보내지 않아도, 회원은 앱에서 오늘 할 운동을 확인합니다.", tag: "PROGRAM / SESSION" },
  { icon: MessageSquare, title: "기록은 다음 코칭으로 이어지고", description: "회원의 운동 후기와 코치 답변을 한곳에 쌓으세요. 미답변 피드백을 확인하고, 이전 기록을 보며 코칭을 이어갑니다.", tag: "RECORD / FEEDBACK" },
  { icon: CreditCard, title: "운영은 한 화면에서 정리됩니다", description: "프로그램 신청, 입금 확인, 멤버십 현황까지. 흩어진 운영 업무를 모아 회원 한 명에게 더 집중할 여유를 만듭니다.", tag: "MEMBERSHIP / OPERATIONS" },
];

const plans = [
  { name: "Starter", price: "무료", audience: "첫 프로그램을 시작하는 코치", features: ["월 활성 회원 최대 3명", "프로그램 1개", "회원 기록·피드백 확인", "마케팅 페이지 제공"] },
  { name: "Growth", price: "9.9만원", audience: "개인 코치와 소규모 팀", features: ["월 활성 회원 최대 10명", "프로그램 최대 5개", "결제·멤버십 관리", "코치 계정 추가"] },
  { name: "Partner", price: "39.9만원", audience: "센터와 트레이닝 브랜드", features: ["월 활성 회원 11~50명", "프로그램 최대 10개", "복수 코치·운영자 계정", "고급 브랜드 설정·도입 지원"] },
  { name: "Enterprise", price: "별도 협의", audience: "규모에 맞춘 운영이 필요한 팀", features: ["월 활성 회원 50명 초과", "커스텀 앱 제공", "운영 구조 맞춤 설계", "도입 세팅 지원"] },
];

export function PlatformLanding({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className={styles.landing} lang="ko">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-zinc-900 focus:p-3">본문으로 건너뛰기</a>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090a0c]">
        <div className={`${container} flex h-18 items-center justify-between gap-3`}>
          <Link href="/" aria-label="clyrtraining 홈" className="text-base font-bold tracking-tight sm:text-lg">clyrtraining<span className="text-blue-400">.</span></Link>
          <nav aria-label="메인 메뉴" className="hidden items-center gap-7 text-xs text-zinc-400 md:flex">
            <a href="#numbers" className="hover:text-white">사용 현황</a><a href="#feature" className="hover:text-white">기능</a><a href="#brands" className="hover:text-white">운영 브랜드</a><a href="#pricing" className="hover:text-white">요금</a>
          </nav>
          <Link href="/login" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-xs text-zinc-200 hover:bg-white/5">{isLoggedIn ? "워크스페이스" : "로그인"}<ArrowUpRight className="size-3.5" /></Link>
        </div>
      </header>

      <main id="main-content">
        <section className={`${container} flex min-h-[640px] flex-col justify-center py-24 sm:min-h-[750px] lg:min-h-[820px]`}>
          <Eyebrow>FOR GYMS & COACHES / CLYRTRAINING</Eyebrow>
          <h1 className="max-w-[960px] text-[38px] font-semibold leading-[1.22] tracking-[-0.045em] text-balance sm:text-6xl lg:text-[72px]">코칭에 집중하세요.<br />운영은 하나로 연결할게요.</h1>
          <p className="mt-7 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8">운동 프로그램, 회원 관리, 기록과 피드백까지.<br className="hidden sm:block" /> 체육관과 코치의 노하우가 오래 이어지도록,<br className="hidden sm:block" /> clyrtraining이 매일의 운영을 함께합니다.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Button asChild className={primary}><a href="#contact">우리 팀 도입 상담하기 <ArrowUpRight className="size-4" /></a></Button><Button asChild className={secondary}><a href="#feature">어떻게 달라지나요 <ArrowDown className="size-4" /></a></Button></div>
          <p className="mt-12 text-xs tracking-wide text-zinc-500">개인 코치부터 체육관, 트레이닝 브랜드까지</p>
        </section>

        <section className="border-y border-white/[0.07] py-8">
          <div className={`${container} flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-center`}>
            <p className="text-xs text-zinc-400">이미 현장에서 함께하는 브랜드</p>
            <div className="flex flex-wrap items-center gap-10 sm:gap-16">
              <Image src="/partners/xon-training-logo.png" alt="XON Training" width={140} height={40} className="h-6 w-auto max-w-36 object-contain brightness-0 invert opacity-75" />
              <Image src="/partners/amor-lab-logo.png" alt="AMOR LAB" width={140} height={40} className="h-5 w-auto max-w-36 object-contain brightness-0 invert opacity-75" />
            </div>
          </div>
        </section>

        <section id="numbers" className={section}>
          <Eyebrow>01 / IN PRACTICE</Eyebrow><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">계획이 아닌,<br className="sm:hidden" /> 현장에서 쌓인 기록.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">회원이 운동하고, 코치가 답하고, 다음 프로그램으로 이어지는 중입니다.</p>
          <dl className="mt-12 sm:mt-16">
            {[
              { label: "함께하는 회원 계정", value: LANDING_METRICS.memberAccounts, unit: "개", sub: "MEMBER ACCOUNTS" },
              { label: "누적 등록 프로그램", value: LANDING_METRICS.programs, unit: "개", sub: "PROGRAMS CREATED" },
              { label: "회원이 남긴 운동 후기", value: LANDING_METRICS.reviews, unit: "건", sub: "SESSION REVIEWS" },
              { label: "코치가 남긴 피드백", value: LANDING_METRICS.coachFeedback, unit: "건", sub: "COACH RESPONSES" },
            ].map((metric) => <div key={metric.sub} className="flex items-end justify-between gap-4 border-b border-[#526aa0] py-7"><dt><span className="mb-2 block font-mono text-[9px] tracking-[0.16em] text-zinc-500 sm:text-[10px]">{metric.sub}</span><span className="text-sm text-zinc-300 sm:text-base">{metric.label}</span></dt><dd className="shrink-0 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{metric.value.toLocaleString("ko-KR")}<span className="ml-2 text-sm font-normal text-zinc-400">{metric.unit}</span></dd></div>)}
          </dl>
          <p className="mt-6 max-w-3xl text-xs leading-6 text-zinc-500">{LANDING_METRICS.asOf} DB 집계 · XON Training / AMOR LAB 합산. 회원 계정은 중복을 제거한 일반 회원 중 탈퇴·비활성 계정을 제외한 수이며, 월간 활성 사용자 수가 아닙니다. 프로그램·후기·답변은 누적 등록 기준입니다.</p>
        </section>

        <section id="feature" className={`${section} grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20`}>
          <div><Eyebrow>02 / LESS ADMIN. MORE COACHING.</Eyebrow><h2 className="text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">메신저와 시트 사이,<br />놓치던 흐름을 하나로.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-zinc-400">프로그램을 보내고, 기록을 찾고, 답변을 남기는 일.<br />따로 하던 일들이 자연스럽게 이어집니다.</p><Button asChild className={`${secondary} mt-8`}><a href="#contact">운영 고민 이야기하기 <ArrowUpRight className="size-4" /></a></Button></div>
          <div>{features.map(({ icon: Icon, title, description, tag }, index) => <article key={title} className="grid grid-cols-[24px_1fr] gap-5 border-t border-white/10 py-8 sm:gap-8"><Icon className="mt-7 size-5 text-zinc-400" aria-hidden="true" /><div><p className="font-mono text-[9px] tracking-widest text-zinc-500">0{index + 1} / {tag}</p><h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3><p className="mt-4 text-sm leading-7 text-zinc-400">{description}</p></div></article>)}</div>
        </section>

        <section id="brands" className={section}>
          <Eyebrow>03 / POWERING REAL TEAMS</Eyebrow><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">당신의 코칭을,<br />당신의 브랜드로.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">회원은 브랜드 앱에서 운동하고, 코치는 워크스페이스에서 운영합니다.<br className="hidden sm:block" /> 실제 운영 중인 앱을 직접 살펴보세요.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {[
              { name: "XON Training", image: "/partners/xon-product-icon.png", category: "TRAINING / COACHING", description: "프로그램과 운동 기록, 코치 피드백을 연결하는 트레이닝 앱.", href: "https://apps.apple.com/kr/app/xon-training/id6760121153" },
              { name: "AMOR LAB", image: "/partners/amor-lab-product-icon.png", category: "BRAND / COACHING", description: "브랜드의 코칭 프로그램과 회원 경험을 담은 전용 앱.", href: "https://apps.apple.com/kr/app/amor-lab/id6765614780" },
            ].map((brand) => <article key={brand.name} className="rounded-2xl border border-white/10 bg-[#101114] p-7 sm:p-9"><div className="mb-12 flex items-start justify-between gap-4"><Image src={brand.image} alt={`${brand.name} 앱 아이콘`} width={88} height={88} className="size-20 rounded-2xl bg-white object-contain p-3" /><span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[9px] tracking-widest text-blue-300">LIVE APP</span></div><p className="font-mono text-[9px] tracking-widest text-zinc-500">{brand.category}</p><h3 className="mt-3 text-2xl font-semibold tracking-tight">{brand.name}</h3><p className="mt-4 text-sm leading-7 text-zinc-400">{brand.description}</p><a href={brand.href} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-3 text-sm text-zinc-200">App Store에서 보기 <ArrowUpRight className="size-4" /></a></article>)}
          </div>
        </section>

        <section id="pricing" className={section}>
          <Eyebrow>04 / ROOM TO GROW</Eyebrow><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">작게 시작하고,<br />팀의 속도로 성장하세요.</h2><p className="mt-5 text-sm leading-7 text-zinc-400">월 활성 회원 규모에 맞춰 선택하는 운영 플랜.</p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{plans.map((plan) => <article key={plan.name} className={`flex flex-col rounded-xl border p-6 ${plan.name === "Growth" ? "border-[#4e70dc] bg-[#111622]" : "border-white/10 bg-[#101114]"}`}><h3 className="text-base font-medium">{plan.name}</h3><p className="mt-3 min-h-10 text-xs leading-5 text-zinc-400">{plan.audience}</p><p className="mt-6 text-2xl font-semibold tracking-tight">{plan.price}{["Growth", "Partner"].includes(plan.name) && <span className="ml-1 text-xs font-normal text-zinc-400">/ 월</span>}</p><ul className="my-8 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs leading-5 text-zinc-300"><Check className="mt-0.5 size-3.5 shrink-0 text-blue-300" aria-hidden="true" />{feature}</li>)}</ul><a href="#contact" className="mt-auto inline-flex min-h-11 items-center justify-between border-t border-white/10 pt-4 text-xs">{plan.name} 문의 <ArrowUpRight className="size-4" /></a></article>)}</div>
          <p className="mt-5 text-xs leading-6 text-zinc-500">Starter는 결제·멤버십 고급 관리를 포함하지 않습니다. 세부 운영 범위와 도입 조건은 상담을 통해 확인해 주세요.</p>
        </section>

        <section id="faq" className={`${section} grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20`}>
          <div><Eyebrow>05 / GOOD QUESTIONS</Eyebrow><h2 className="text-3xl font-semibold tracking-tight">시작하기 전에.</h2></div>
          <div>{[
            ["개인 코치도 사용할 수 있나요?", "네. 첫 프로그램을 운영하는 개인 코치부터 복수 코치가 함께하는 체육관까지, 회원 규모와 운영 방식에 맞춰 시작할 수 있습니다."],
            ["기존 프로그램을 옮길 수 있나요?", "주차별 세션, 운동 설명과 콘텐츠를 프로그램으로 정리할 수 있습니다. 기존 자료의 형태와 양을 알려주시면 도입 상담에서 이전 범위를 함께 확인합니다."],
            ["하이록스 외 운동에도 사용할 수 있나요?", "근력, 컨디셔닝, 러닝, 팀 트레이닝처럼 프로그램과 세션을 중심으로 운영하는 코칭에 활용할 수 있습니다."],
            ["회원 화면과 코치 화면은 다른가요?", "회원은 앱에서 프로그램을 확인하고 운동 기록과 후기를 남깁니다. 코치는 별도의 워크스페이스에서 회원 현황과 피드백을 관리합니다."],
          ].map(([question, answer]) => <details key={question} className="group border-b border-white/10 py-6"><summary className="pr-2 text-sm font-medium leading-6 text-zinc-200 sm:text-base">{question}</summary><p className="mt-5 text-sm leading-7 text-zinc-400">{answer}</p></details>)}</div>
        </section>

        <section id="contact" className={section}>
          <Eyebrow>06 / LET’S BUILD YOUR WORKSPACE</Eyebrow><h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">다음 코칭의 시작,<br />함께 만들어볼까요?</h2><p className="mb-12 mt-5 text-sm leading-7 text-zinc-400">지금의 운영 방식을 들려주세요. 우리 팀에 맞는 시작점을 함께 찾겠습니다.</p>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16"><PlatformContactForm /><aside className="h-fit rounded-2xl border border-white/10 bg-[#101114] p-7 sm:p-9"><Eyebrow>SAY HELLO</Eyebrow><a href={`mailto:${CONTACT_EMAIL}`} className="break-all text-lg font-semibold tracking-tight text-blue-300 sm:text-2xl">{CONTACT_EMAIL}</a><p className="mt-5 text-sm leading-7 text-zinc-400">개인 코치의 첫 프로그램도,<br />체육관의 새로운 운영 방식도 환영합니다.</p><div className="mt-10 flex flex-wrap gap-3"><a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs"><Mail className="size-3.5" />이메일</a><a href="https://www.instagram.com/kxxclear" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-xs"><Instagram className="size-3.5" />Instagram</a></div></aside></div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] py-12"><div className={`${container} flex flex-col justify-between gap-8 sm:flex-row`}><div><Link href="/" className="text-lg font-semibold tracking-tight">clyrtraining.</Link><p className="mt-3 text-xs text-zinc-500">Less admin. More coaching.</p></div><nav aria-label="하단 메뉴" className="flex flex-wrap gap-x-6 gap-y-4 text-xs text-zinc-400"><a href="#feature">기능 소개</a><a href="#pricing">요금 안내</a><a href="#contact">도입 문의</a><Link href="/login">로그인 <ArrowRight className="ml-1 inline size-3" /></Link></nav></div></footer>
    </div>
  );
}
