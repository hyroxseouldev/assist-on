import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type UserAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function UserAuthPanel({ teamName, logoUrl }: UserAuthPanelProps) {
  return (
    <section className="space-y-8">
      <div className="space-y-5">
        <Badge className="bg-zinc-900 text-white hover:bg-zinc-900">User Access</Badge>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white p-1">
              <Image src={logoUrl} alt={`${teamName} 로고`} fill className="object-contain" sizes="44px" priority />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">Assist On</p>
              <p className="truncate text-lg font-semibold text-zinc-950">{teamName}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              사용자 로그인은 Google 계정으로 빠르게 시작합니다.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-zinc-600 sm:text-base">
              테넌트 어드민과 동일한 브랜드 환경 안에서 로그인하고, 프로그램 확인과 내 활동 관리를 바로 이어서 진행할 수 있어요.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">01</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">소셜 로그인만 지원</p>
            <p className="mt-1 text-sm leading-5 text-zinc-600">비밀번호 입력 없이 Google 계정으로 바로 인증합니다.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">02</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">빠른 시작</p>
            <p className="mt-1 text-sm leading-5 text-zinc-600">로그인 후 내 페이지 또는 접근 가능한 테넌트 화면으로 이동합니다.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">03</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">안정적인 접근</p>
            <p className="mt-1 text-sm leading-5 text-zinc-600">브랜드와 계정 상태를 확인한 뒤 안전한 경로로만 리다이렉트합니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
