import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthLandingShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  eyebrow?: string;
  logoUrl?: string;
  brandName?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function AuthLandingShell({
  title,
  description,
  children,
  eyebrow = "CLYRTRAINING",
  logoUrl = "/brand/clyr-logo.png",
  brandName = "clyrtraining",
  backHref = "/",
  backLabel = "홈으로 돌아가기",
  className,
}: AuthLandingShellProps) {
  return (
    <div className={cn("min-h-screen bg-white text-zinc-950", className)}>
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]">
        <section className="hidden min-h-screen flex-col justify-between border-r border-zinc-200/80 bg-zinc-50 px-10 py-10 lg:flex xl:px-16">
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>

          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="relative block size-11 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
                <Image src={logoUrl} alt={`${brandName} 로고`} fill className="object-contain p-1.5" sizes="44px" priority />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
                <p className="truncate text-lg font-semibold tracking-tight text-zinc-950">{brandName}</p>
              </div>
            </div>

            <div className="max-w-xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 xl:text-5xl">{title}</h1>
              <p className="text-base leading-7 text-zinc-600">{description}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm text-zinc-600">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-semibold text-zinc-950">Program</p>
              <p className="mt-1 text-xs leading-5">세션과 운동 콘텐츠 관리</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-semibold text-zinc-950">Members</p>
              <p className="mt-1 text-xs leading-5">회원과 멤버십 운영</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="font-semibold text-zinc-950">Feedback</p>
              <p className="mt-1 text-xs leading-5">기록과 피드백 확인</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16 xl:px-20">
          <div className="lg:hidden">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-950"
            >
              <ChevronLeft className="size-4" />
              {backLabel}
            </Link>
          </div>

          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-[460px] py-12">
              <div className="mb-8 flex items-center gap-3">
                <span className="relative block size-10 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
                  <Image src={logoUrl} alt={`${brandName} 로고`} fill className="object-contain p-1.5" sizes="40px" priority />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>
                  <p className="truncate text-lg font-semibold text-zinc-950">{brandName}</p>
                </div>
              </div>

              {children}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
