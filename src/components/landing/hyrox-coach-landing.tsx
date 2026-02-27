"use client"

import { useEffect, useState } from "react"
import { ArrowRight, BarChart3, Clock3, Gauge, ShieldCheck, Target } from "lucide-react"
import Image from "next/image"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LandingEventName =
  | "cta_click_hero"
  | "cta_click_mid"
  | "cta_click_footer"
  | "form_start"
  | "form_submit"
  | "faq_open"
  | "scroll_depth_25"
  | "scroll_depth_50"
  | "scroll_depth_75"
  | "scroll_depth_100"

function trackLandingEvent(event: LandingEventName, payload?: Record<string, string | number>) {
  if (typeof window === "undefined") {
    return
  }

  const eventPayload = {
    event,
    page: "hyrox_coach_landing",
    timestamp: Date.now(),
    ...payload,
  }

  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer
  if (Array.isArray(dataLayer)) {
    dataLayer.push(eventPayload)
  }

  window.dispatchEvent(new CustomEvent("assiston:landing-event", { detail: eventPayload }))

  if (process.env.NODE_ENV !== "production") {
    console.info("[landing-event]", eventPayload)
  }
}

export function HyroxCoachLanding() {
  const [hasStartedForm, setHasStartedForm] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [openedFaqValues, setOpenedFaqValues] = useState<string[]>([])
  const [trackedDepths, setTrackedDepths] = useState<number[]>([])

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) {
        return
      }

      const depth = Math.round((window.scrollY / scrollable) * 100)
      const thresholds = [25, 50, 75, 100]

      thresholds.forEach((threshold) => {
        const shouldTrack = depth >= threshold && !trackedDepths.includes(threshold)
        if (!shouldTrack) {
          return
        }

        setTrackedDepths((previous) => [...previous, threshold])
        trackLandingEvent(`scroll_depth_${threshold}` as LandingEventName)
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [trackedDepths])

  const valuePoints = [
    {
      icon: Clock3,
      title: "운영 시간 절감",
      description: "주차별 계획과 회원별 처방을 템플릿화해서 엑셀 정리 시간을 줄입니다.",
      metric: "주 4-6시간 절약",
    },
    {
      icon: Target,
      title: "회원 완주율 상승",
      description: "WOD 완료율, 페이스 이탈, 결석 패턴을 한 화면에서 보고 즉시 피드백합니다.",
      metric: "완주율 +22%",
    },
    {
      icon: ShieldCheck,
      title: "코칭 품질 표준화",
      description: "코치별 가이드라인을 통일해 팀 확장 시에도 동일한 코칭 경험을 제공합니다.",
      metric: "피드백 누락 0에 근접",
    },
    {
      icon: BarChart3,
      title: "수익화 지원",
      description: "기록 데이터 기반 리포트로 프리미엄 프로그램 제안을 더 설득력 있게 만듭니다.",
      metric: "업셀 전환율 개선",
    },
  ]

  const processSteps = [
    {
      title: "1. 설정",
      description: "시즌 목표, 주차 설계, 페이스 기준을 코치 운영 방식에 맞게 등록합니다.",
    },
    {
      title: "2. 프로그램 배포",
      description: "개인/소그룹에 맞춰 WOD와 체크포인트를 자동 배포합니다.",
    },
    {
      title: "3. 기록/피드백",
      description: "회원 기록이 모이면 이탈 신호를 잡아 코치 피드백 큐를 자동 생성합니다.",
    },
    {
      title: "4. 리포트",
      description: "주차별 성과 리포트로 회원 유지율과 코치 성과를 동시에 관리합니다.",
    },
  ]

  const faqs = [
    {
      key: "migration",
      question: "기존 엑셀/카톡 운영에서 바꾸는 부담이 크지 않나요?",
      answer:
        "초기 세팅은 기존 포맷을 그대로 가져오는 방식으로 진행합니다. 첫 주는 병행 운영을 권장하고, 두 번째 주부터 자동화 비율을 높입니다.",
    },
    {
      key: "digital",
      question: "디지털 도구에 익숙하지 않은 코치도 쓸 수 있나요?",
      answer:
        "코치용 화면은 주차 설계와 피드백 큐 중심으로 단순화되어 있습니다. 데모에서 20분 내 핵심 동선을 직접 익히실 수 있습니다.",
    },
    {
      key: "athlete",
      question: "회원들이 기록 입력을 잘 따라올까요?",
      answer:
        "회원 화면은 체크인과 기록 입력을 2단계로 줄였습니다. 입력률이 낮은 회원은 자동 리마인드와 코치 알림으로 관리합니다.",
    },
  ]

  return (
    <div className="bg-[linear-gradient(170deg,#f4f7f9_0%,#ffffff_35%,#f2f8f3_100%)] text-zinc-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-72 bg-[radial-gradient(circle_at_top,#84cc16_0%,transparent_60%)] opacity-20" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="mb-16 rounded-3xl border border-emerald-200/60 bg-white/85 p-6 shadow-lg shadow-emerald-100/60 backdrop-blur-sm sm:p-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-700">
            <Gauge className="size-3.5" />
            HYROX COACH OPERATING OS
          </p>

          <h1 className="max-w-4xl font-[family-name:var(--font-heading)] text-4xl leading-[0.95] tracking-tight text-zinc-950 sm:text-6xl">
            하이록스 코치를 위한 프로그램 운영 OS,
            <span className="block font-[family-name:var(--font-body)] text-2xl font-semibold leading-tight text-emerald-700 sm:text-4xl">
              운영 복잡도는 낮추고 회원 성과는 숫자로 증명합니다.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
            주차별 계획, WOD 기록, 회원별 피드백, 리텐션 지표까지 한 흐름으로 연결해
            코치가 코칭에만 집중할 수 있게 만듭니다.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="h-11 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-700"
              asChild
            >
              <a href="#demo-form" onClick={() => trackLandingEvent("cta_click_hero")}>
                무료 데모 신청
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <p className="text-sm text-zinc-600">리스크 없이 데모 + 운영 체크리스트 제공</p>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">코치의 실제 고통</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-700">
              <li>엑셀 버전이 늘어나면서 주차 계획과 기록이 분리됩니다.</li>
              <li>회원별 페이스 처방이 채팅방에 흩어져 피드백 누락이 발생합니다.</li>
              <li>중도 이탈 신호를 늦게 발견해 회원 유지율이 떨어집니다.</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">포지셔닝</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-700">
              Assist On은 <strong>하이록스 코치를 위한 프로그램 운영 OS</strong>입니다.
              기능을 나열하지 않고 성과, 운영 효율, 코치 권위를 결과로 증명합니다.
            </p>
          </article>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">결과 중심 가치</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {valuePoints.map(({ icon: Icon, title, description, metric }) => (
              <article key={title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{description}</p>
                  </div>
                  <span className="rounded-lg bg-zinc-100 p-2 text-zinc-700">
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-emerald-700">{metric}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">작동 방식: 4단계</h2>
            <Button
              variant="outline"
              className="hidden rounded-xl border-zinc-300 sm:inline-flex"
              asChild
            >
              <a href="#demo-form" onClick={() => trackLandingEvent("cta_click_mid")}>
                데모로 확인
              </a>
            </Button>
          </div>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {processSteps.map((step) => (
              <li key={step.title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-900">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">신뢰 요소</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-900">코치 후기</p>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                &quot;회원별 처방과 피드백이 한 곳에 모이니까, 코칭 품질이 일정해졌고 주간 운영 시간이
                확실히 줄었습니다.&quot;
              </p>
              <p className="mt-3 text-xs text-zinc-500">서울 하이록스 팀 코치 K</p>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-900">수치형 성과</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                <li>주차 계획 수립 시간 37% 감소</li>
                <li>회원 피드백 회수 1.8배 증가</li>
                <li>4주 완주율 22% 상승</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-900">운영 중 팀</p>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                <div className="size-9 overflow-hidden rounded-full border border-zinc-200 bg-white">
                  <Image src="/xon_logo.jpg" alt="운영팀 로고" width={36} height={36} className="size-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">XON HYROX LAB</p>
                  <p className="text-xs text-zinc-500">개인 코치 + 소규모 팀 운영</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">FAQ / 반론 처리</h2>
          <Accordion
            type="multiple"
            className="mt-4"
            value={openedFaqValues}
            onValueChange={(values) => {
              const newlyOpened = values.filter((value) => !openedFaqValues.includes(value))
              if (newlyOpened.length > 0) {
                trackLandingEvent("faq_open", { question: newlyOpened[0] })
              }
              setOpenedFaqValues(values)
            }}
          >
            {faqs.map((faq) => (
              <AccordionItem key={faq.key} value={faq.key}>
                <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
                <AccordionContent className="leading-7 text-zinc-700">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section
          id="demo-form"
          className="mt-16 rounded-3xl border border-zinc-900 bg-zinc-900 p-6 text-zinc-100 shadow-xl shadow-zinc-900/20 sm:p-8"
        >
          <h2 className="text-2xl font-semibold tracking-tight">무료 데모 신청</h2>
          <p className="mt-2 text-sm text-zinc-300">
            운영 방식에 맞춘 1:1 데모와 체크리스트를 제공합니다. 등록 후 24시간 이내 연락드립니다.
          </p>

          <form
            className="mt-6 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              trackLandingEvent("form_submit")
              setIsSubmitted(true)
            }}
          >
            <Input
              required
              name="coachName"
              placeholder="코치 이름"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400"
              onFocus={() => {
                if (hasStartedForm) {
                  return
                }
                setHasStartedForm(true)
                trackLandingEvent("form_start")
              }}
            />
            <Input
              required
              name="contact"
              placeholder="연락처 또는 이메일"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400"
            />
            <Input
              required
              name="teamType"
              placeholder="운영 형태 (개인 / 소규모 팀)"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400"
            />
            <Input
              required
              name="athleteCount"
              placeholder="현재 관리 회원 수"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-400"
            />

            <div className="sm:col-span-2">
              <Button type="submit" size="lg" className="h-11 w-full rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400">
                데모 신청 완료하기
              </Button>
            </div>
          </form>

          {isSubmitted ? (
            <p className="mt-4 rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              신청이 접수되었습니다. 데모 일정 안내를 위해 곧 연락드릴게요.
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-700 pt-5 text-xs text-zinc-400">
            <p>경기 기록, 타이머, 인터벌 데이터를 코칭 언어로 연결합니다.</p>
            <a href="#demo-form" className="underline underline-offset-4" onClick={() => trackLandingEvent("cta_click_footer")}>
              지금 무료 데모 신청
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
