import { ArrowRight, BarChart3, Check, ChevronRight, Mail, MapPin, MessageCircle, Rocket, ShieldCheck, Smartphone, Users } from "lucide-react";

import { LandingNav } from "@/components/navigation/landing-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const heroStats = [
  { value: "3+", label: "파트너 센터" },
  { value: "200+", label: "활성 회원" },
  { value: "1위", label: "Hyrox 아시아 챔피언 코칭" },
] as const;

const introItems = [
  {
    number: "01",
    title: "브랜드 커스터마이징",
    description: "센터 로고, 컬러, 이름이 그대로 반영된 전용 앱 경험을 빠르게 구성할 수 있습니다.",
  },
  {
    number: "02",
    title: "프로그램 일괄 관리",
    description: "주차별, 일자별 루틴을 하나의 운영 화면에서 업로드하고 수정할 수 있습니다.",
  },
  {
    number: "03",
    title: "회원 데이터 추적",
    description: "운동 완료 여부, 기록 변화, 피드백 흐름까지 데이터 기반 코칭으로 연결합니다.",
  },
  {
    number: "04",
    title: "빠른 런칭",
    description: "복잡한 개발 과정을 줄이고 코치는 프로그램 품질과 회원 경험에 집중할 수 있습니다.",
  },
] as const;

const featureItems = [
  {
    icon: Smartphone,
    number: "01",
    title: "커스텀 브랜드 앱",
    description: "센터 이름과 로고가 반영된 전용 앱 경험으로 회원 접점을 브랜드 자산으로 바꿉니다.",
    tag: "Brand Identity",
    featured: false,
  },
  {
    icon: Rocket,
    number: "02",
    title: "프로그램 스케줄러",
    description: "주차별, 일자별 운동 루틴을 설계하고 회원에게 실시간으로 배포할 수 있습니다.",
    tag: "Core Feature",
    featured: true,
  },
  {
    icon: BarChart3,
    number: "03",
    title: "퍼포먼스 기록",
    description: "개인 기록과 완료율, 참여 추이를 한 번에 확인해 코칭 판단을 빠르게 만듭니다.",
    tag: "Analytics",
    featured: false,
  },
  {
    icon: MessageCircle,
    number: "04",
    title: "운동 피드백 시스템",
    description: "회원 피드백을 루틴 기록과 함께 모아 프로그램 조정과 소통 품질을 높입니다.",
    tag: "Feedback",
    featured: false,
  },
  {
    icon: Users,
    number: "05",
    title: "회원 관리",
    description: "가입, 구독, 활성 회원 흐름을 한 화면에서 파악하고 이탈 위험까지 조기에 감지합니다.",
    tag: "Management",
    featured: false,
  },
  {
    icon: ShieldCheck,
    number: "06",
    title: "코치 프로필",
    description: "코치의 자격과 철학, 프로그램 관점을 앱 안에서 신뢰도 높은 소개 자산으로 보여줍니다.",
    tag: "Trust Building",
    featured: false,
  },
] as const;

const partners = [
  {
    brand: "XON TRAINING",
    coach: "김원준 코치",
    quote: "기존에 카카오톡과 노션으로 분산 운영하던 코칭을 하나로 모으면서 회원 참여율이 눈에 띄게 높아졌습니다.",
    handle: "@no.1_joon",
    accent: "K",
  },
  {
    brand: "XON TRAINING",
    coach: "봉코치",
    quote: "프로그램 배포와 피드백 정리가 단순해져서 운영보다 코칭 자체에 더 집중할 수 있게 됐습니다.",
    handle: "@bong",
    accent: "B",
  },
  {
    brand: "Sweat Monday",
    coach: "Amor 코치",
    quote: "회원 기록과 완료율이 자연스럽게 쌓이니까 코칭 설득력이 커지고 리텐션 관리도 쉬워졌어요.",
    handle: "@amor.jh",
    accent: "A",
  },
] as const;

const marqueeItems = [
  "CUSTOM COACHING APP",
  "HYROX SPECIALIST",
  "PROGRAM MANAGEMENT",
  "MEMBER TRACKING",
  "YOUR BRAND YOUR APP",
  "REAL-TIME FEEDBACK",
  "COACH DASHBOARD",
] as const;

export function ClyrBrandLanding() {
  return (
    <div className="min-h-screen bg-[#080809] text-[#f2f1ed]">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-10 lg:pb-24 lg:pt-32" id="hero">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_35%,black_20%,transparent_80%)]" />
          <div className="absolute right-[8%] top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,136,0,0.18)_0%,transparent_65%)] blur-3xl" />
          <div className="absolute bottom-0 left-[8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(207,62,0,0.18)_0%,transparent_68%)] blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Badge className="mb-6 rounded-full border border-[#ff8800]/30 bg-[#ff8800]/10 px-4 py-1 text-[11px] font-bold tracking-[0.26em] text-[#ff8800] hover:bg-[#ff8800]/10">
                For Coaches & Athletic Centers
              </Badge>

              <h1 className="max-w-4xl text-[clamp(3.9rem,9vw,7.2rem)] font-semibold uppercase leading-[0.86] tracking-[0.02em] text-[#f2f1ed]">
                YOUR<br />
                <span className="text-[#ff8800]">BRAND.</span>
                <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(242,241,237,0.28)]">YOUR APP.</span>
              </h1>

              <p className="mt-8 max-w-xl text-base leading-8 text-[#b0b0b8] sm:text-lg">
                코치와 센터를 위한 커스텀 트레이닝 앱 플랫폼.
                <br />
                당신의 코칭 철학과 프로그램을 하나의 앱 경험으로 완성하세요.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="h-12 rounded-none bg-[#ff8800] px-7 text-sm font-bold tracking-[0.18em] text-[#080809] hover:bg-[#cf3e00]">
                  <a href="#contact">무료 상담 받기</a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-none px-0 text-sm font-semibold tracking-[0.16em] text-[#9999a3] hover:bg-transparent hover:text-[#f2f1ed]"
                >
                  <a href="#features">
                    기능 보기
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              </div>

              <div className="mt-12 grid gap-5 border-t border-white/10 pt-8 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <p className="text-4xl font-semibold tracking-tight text-[#f2f1ed]">{stat.value}</p>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9999a3]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden min-h-[620px] items-center justify-center lg:flex">
              <div className="absolute h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,136,0,0.16)_0%,transparent_65%)] blur-3xl" />

              <div className="relative h-[580px] w-[340px] animate-[float_5s_ease-in-out_infinite]">
                <div className="absolute bottom-0 right-0 h-[500px] w-[240px] rotate-[6deg] rounded-[30px] border border-white/10 bg-[#1a1a1d]/70 shadow-[0_24px_60px_rgba(0,0,0,0.45)]" />

                <div className="absolute left-0 top-0 h-[540px] w-[260px] overflow-hidden rounded-[38px] border border-white/10 bg-[#111113] shadow-[0_32px_80px_rgba(0,0,0,0.65)]">
                  <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

                  <div className="flex h-full flex-col gap-3 px-4 pb-4 pt-12">
                    <div className="flex items-center justify-between">
                      <div className="text-xl font-semibold uppercase tracking-[0.22em] text-[#f2f1ed]">
                        clyr<span className="text-[#ff8800]">.</span>
                      </div>
                      <div className="flex size-8 items-center justify-center rounded-full border border-[#ff8800] bg-[#252528] text-xs font-bold text-[#ff8800]">
                        K
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[linear-gradient(135deg,#ff8800_0%,#cf3e00_100%)] p-4 text-[#080809]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-60">Today&apos;s Program</p>
                      <p className="mt-1 text-xl font-semibold uppercase tracking-[0.08em]">HYROX WEEK 4 - D3</p>
                      <div className="mt-4 h-1 rounded-full bg-black/15">
                        <div className="h-1 w-[68%] rounded-full bg-black/50" />
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] font-semibold opacity-65">
                        <span>68% 완료</span>
                        <span>5 / 7 세션</span>
                      </div>
                    </div>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9999a3]">오늘의 루틴</p>

                    {[
                      { icon: "R", name: "Run 1km - Pace Work", meta: "4:30 / km 목표 - 15min", done: true, tone: "bg-[#ff8800]/15 text-[#ff8800]" },
                      { icon: "W", name: "Wall Balls 10kg x 3", meta: "20 reps - 3 sets", done: true, tone: "bg-[#cf3e00]/15 text-[#cf3e00]" },
                      { icon: "S", name: "Ski Erg 1000m", meta: "Target: 4:10", done: false, tone: "bg-white/8 text-[#f2f1ed]" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center gap-3 rounded-xl bg-[#252528] px-3 py-3">
                        <div className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold ${item.tone}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#f2f1ed]">{item.name}</p>
                          <p className="text-[11px] text-[#9999a3]">{item.meta}</p>
                        </div>
                        <div className={`flex size-5 items-center justify-center rounded-full border ${item.done ? "border-[#ff8800] bg-[#ff8800] text-black" : "border-white/12 text-transparent"}`}>
                          <Check className="size-3" />
                        </div>
                      </div>
                    ))}

                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {[
                        { label: "Members", value: "24", tone: "text-[#ff8800]" },
                        { label: "Completion", value: "92%", tone: "text-[#cf3e00]" },
                        { label: "Active Now", value: "8", tone: "text-[#f2f1ed]" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl bg-[#252528] px-2 py-3 text-center">
                          <p className={`text-2xl font-semibold ${item.tone}`}>{item.value}</p>
                          <p className="mt-1 text-[10px] text-[#9999a3]">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-white/8 bg-[#111113] py-4">
          <div className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div className="flex min-w-max animate-[marquee_28s_linear_infinite]">
              {[...marqueeItems, ...marqueeItems].map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-4 px-8 text-sm font-semibold uppercase tracking-[0.22em] text-[#9999a3]">
                  <span className="size-1.5 rounded-full bg-[#ff8800]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="intro" className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:px-10 lg:py-28">
          <div>
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-[#ff8800]">About clyr</p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-[#f2f1ed] sm:text-5xl">코치의 언어로 만든 앱</h2>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#b0b0b8]">
              Clyr는 온라인 코칭 프로그램을 운영하는 코치와 센터를 위해 설계된 커스텀 앱 플랫폼입니다.
              <br />
              <br />
              카카오톡, 노션, 엑셀로 분산되던 코칭 워크플로우를 하나의 브랜디드 앱 경험으로 통합해,
              회원이 더 자연스럽게 참여하고 코치는 더 선명하게 관리할 수 있도록 돕습니다.
            </p>
          </div>

          <div className="border-t border-white/8">
            {introItems.map((item) => (
              <div key={item.number} className="grid gap-4 border-b border-white/8 py-7 sm:grid-cols-[64px_1fr] sm:gap-6">
                <p className="text-sm font-semibold tracking-[0.16em] text-[#ff8800]">{item.number}</p>
                <div>
                  <h3 className="text-xl font-semibold text-[#f2f1ed]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#b0b0b8]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="bg-[#111113] px-4 py-16 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-12 flex flex-col gap-4 lg:mb-16">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff8800]">Features</p>
              <h2 className="text-4xl font-semibold leading-tight text-[#f2f1ed] sm:text-5xl">
                코칭에
                <br />
                필요한 모든 것
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className={`group relative overflow-hidden border-white/6 ${item.featured ? "bg-[#1a1a1d]" : "bg-[#1a1a1d]"}`}
                  >
                    <div className="absolute inset-0 translate-y-full bg-[#ff8800] transition-transform duration-500 ease-out group-hover:translate-y-0" />
                    <CardHeader className="relative gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ff8800]/12 text-[#ff8800] transition-colors group-hover:bg-black/12 group-hover:text-[#080809]">
                          <Icon className="size-5" />
                        </div>
                        <span className="text-5xl font-semibold tracking-tight text-white/5 transition-colors group-hover:text-black/10">{item.number}</span>
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-[#f2f1ed] transition-colors group-hover:text-[#080809]">{item.title}</CardTitle>
                        <p className="mt-3 text-sm leading-7 text-[#9999a3] transition-colors group-hover:text-black/70">{item.description}</p>
                        <Badge className="mt-5 rounded-full border border-[#ff8800]/20 bg-[#ff8800]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ff8800] transition-colors group-hover:border-transparent group-hover:bg-black/10 group-hover:text-[#080809] hover:bg-[#ff8800]/10">
                          {item.tag}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="partners" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-28">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff8800]">Partners</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#f2f1ed] sm:text-5xl">
              Clyr와 함께하는
              <br />
              코치들
            </h2>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {partners.map((partner) => (
              <Card key={partner.handle} className="border-white/6 bg-[#1a1a1d] py-0">
                <CardContent className="flex h-full flex-col items-center px-8 py-10 text-center">
                  <div className="flex size-20 items-center justify-center rounded-full border border-white/10 bg-[#252528] text-2xl font-semibold text-[#ff8800]">
                    {partner.accent}
                  </div>
                  <p className="mt-6 text-xl font-semibold uppercase tracking-[0.12em] text-[#f2f1ed]">{partner.brand}</p>
                  <p className="mt-2 text-sm text-[#9999a3]">{partner.coach}</p>
                  <p className="mt-6 flex-1 text-sm leading-8 text-[#c7c7ce]">&quot;{partner.quote}&quot;</p>
                  <p className="mt-5 text-sm font-semibold text-[#ff8800]">{partner.handle}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="relative mt-12 overflow-hidden border-white/6 bg-[#1a1a1d] py-0">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(4rem,16vw,11rem)] font-semibold uppercase tracking-[0.08em] text-white/[0.03]">
              PARTNER
            </div>
            <CardContent className="relative px-6 py-12 text-center sm:px-10">
              <h3 className="text-3xl font-semibold text-[#f2f1ed] sm:text-4xl">다음 파트너는 당신입니다</h3>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#b0b0b8] sm:text-base">
                지금 바로 Clyr로 나만의 코칭 앱을 시작해보세요.
              </p>
              <Button asChild size="lg" className="mt-8 h-12 rounded-none bg-[#ff8800] px-7 text-sm font-bold tracking-[0.18em] text-[#080809] hover:bg-[#cf3e00]">
                <a href="#contact">
                  무료 상담 신청
                  <ChevronRight className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section id="contact" className="bg-[#111113] px-4 py-16 sm:px-6 lg:px-10 lg:py-28">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff8800]">Contact</p>
              <h2 className="mt-4 text-[clamp(3.2rem,7vw,5.8rem)] font-semibold uppercase leading-[0.92] text-[#f2f1ed]">
                START
                <br />
                <span className="text-[#ff8800]">YOUR</span>
                <br />
                <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(242,241,237,0.22)]">JOURNEY</span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-8 text-[#b0b0b8]">
                도입 문의부터 데모 체험까지 부담 없이 연락주세요.
                <br />
                코치와 센터의 운영 상황에 맞는 플랜을 함께 설계해드립니다.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Mail, label: "Email", value: "hello@clyr.app" },
                  { icon: MessageCircle, label: "Instagram", value: "@kxxclear" },
                  { icon: MapPin, label: "Base", value: "Seoul, Korea" },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="flex items-center gap-4">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-[#252528] text-[#ff8800]">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]">{item.label}</p>
                        <p className="mt-1 text-sm text-[#f2f1ed]">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Card className="border-white/6 bg-[#1a1a1d] py-0">
              <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]" htmlFor="contact-name">
                      이름
                    </label>
                    <Input
                      id="contact-name"
                      placeholder="홍길동"
                      className="h-12 rounded-none border-white/8 bg-[#111113] text-[#f2f1ed] placeholder:text-[#666670]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]" htmlFor="contact-phone">
                      연락처
                    </label>
                    <Input
                      id="contact-phone"
                      placeholder="010-0000-0000"
                      className="h-12 rounded-none border-white/8 bg-[#111113] text-[#f2f1ed] placeholder:text-[#666670]"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]" htmlFor="contact-email">
                    이메일
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="coach@example.com"
                    className="h-12 rounded-none border-white/8 bg-[#111113] text-[#f2f1ed] placeholder:text-[#666670]"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]" htmlFor="contact-type">
                    유형
                  </label>
                  <Input
                    id="contact-type"
                    placeholder="개인 코치 / 크로스핏 센터 / 하이록스 센터"
                    className="h-12 rounded-none border-white/8 bg-[#111113] text-[#f2f1ed] placeholder:text-[#666670]"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9999a3]" htmlFor="contact-message">
                    문의 내용
                  </label>
                  <Textarea
                    id="contact-message"
                    placeholder="운영 중인 프로그램, 회원 규모, 궁금한 점 등을 자유롭게 적어주세요."
                    className="min-h-36 rounded-none border-white/8 bg-[#111113] text-[#f2f1ed] placeholder:text-[#666670]"
                  />
                </div>

                <Button type="button" className="mt-6 flex h-14 w-full items-center justify-between rounded-none bg-[#ff8800] px-6 text-sm font-bold tracking-[0.18em] text-[#080809] hover:bg-[#cf3e00]">
                  <span>문의 보내기</span>
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#080809] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="relative inline-flex text-2xl font-semibold uppercase tracking-[0.28em] text-[#f2f1ed]">
            clyr
            <span className="absolute -right-3 bottom-1 size-1.5 rounded-full bg-[#ff8800]" />
          </div>
          <p className="text-sm text-[#9999a3]">© 2025 clyr. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 text-xs font-medium uppercase tracking-[0.16em] text-[#9999a3] sm:justify-end">
            <a href="#">개인정보처리방침</a>
            <a href="#">이용약관</a>
            <a href="#contact">문의</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
