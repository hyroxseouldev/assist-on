import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, MessageSquare, Users } from "lucide-react";

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh bg-white text-zinc-950 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#123d32] p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 size-[600px] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 size-[360px] rounded-full border border-white/10" />
        <Link href="/" className="relative flex w-fit items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <span className="relative size-10 overflow-hidden rounded-xl bg-white">
            <Image src="/brand/clyr-logo.png" alt="" fill sizes="40px" className="object-contain p-1.5" priority />
          </span>
          <span className="text-xl font-semibold tracking-tight">clyrtraining<span className="text-emerald-300">.</span></span>
        </Link>

        <div className="relative py-16">
          <p className="mb-6 flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-300" /> COACHING WORKSPACE
          </p>
          <h2 className="text-4xl font-semibold leading-[1.3] tracking-tight xl:text-5xl">
            더 나은 코칭에,<br />온전히 집중하세요.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-emerald-50/75">
            프로그램부터 회원 관리, 매일의 피드백까지.<br />코칭에 필요한 모든 흐름을 한곳에서 이어갑니다.
          </p>
          <div className="mt-12 space-y-5 border-t border-white/15 pt-7">
            {[
              { icon: CalendarDays, title: "프로그램 운영", text: "세션과 운동 일정을 체계적으로" },
              { icon: Users, title: "회원 관리", text: "회원과 멤버십 현황을 한눈에" },
              { icon: MessageSquare, title: "코칭 피드백", text: "기록을 살피고 성장을 함께" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-4">
                <Icon className="size-5 shrink-0 text-emerald-200" aria-hidden="true" />
                <p className="text-sm font-medium">{title}<span className="ml-3 text-xs font-normal text-emerald-50/65">{text}</span></p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs tracking-wide text-emerald-50/60">Built for coaches. Made for progress.</p>
      </section>

      <section className="flex min-w-0 flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <Link href="/" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">
          <ArrowLeft className="size-4" aria-hidden="true" /> 홈으로 돌아가기
        </Link>
        <div className="flex flex-1 items-center py-10 sm:py-16">
          <div className="mx-auto w-full max-w-[380px]">
            <div className="mb-10 flex items-center gap-2.5">
              <span className="relative size-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <Image src="/brand/clyr-logo.png" alt="" fill sizes="36px" className="object-contain p-1" priority />
              </span>
              <span className="text-base font-semibold tracking-tight">clyrtraining<span className="text-emerald-700">.</span></span>
              <span className="ml-auto rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-semibold tracking-wider text-zinc-500">WORKSPACE</span>
            </div>
            {children}
            <p className="mt-8 border-t border-zinc-100 pt-6 text-xs leading-6 text-zinc-500">
              계정이나 접근 권한이 필요하신가요?<br />소속 워크스페이스 관리자에게 문의해 주세요.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-500">
          <span>clyrtraining · Coaching workspace</span>
          <Link href="/" className="inline-flex min-h-9 items-center gap-1 rounded-sm hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-emerald-700">서비스 홈 <ArrowUpRight className="size-3" aria-hidden="true" /></Link>
        </div>
      </section>
    </main>
  );
}
