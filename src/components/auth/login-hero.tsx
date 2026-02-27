import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type LoginHeroProps = {
  teamName: string;
  logoUrl: string;
};

export function LoginHero({ teamName, logoUrl }: LoginHeroProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <Image src={logoUrl || "/xon_logo.jpg"} alt={`${teamName} 로고`} fill className="object-cover" priority />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">HYROX TRAINING TEAM</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{teamName}</h1>
        </div>
      </div>

      <div className="space-y-4">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Tenant Login · Owner / Coach</Badge>
        <p className="text-lg leading-relaxed text-zinc-800">
          테넌트 운영자를 위한 전용 로그인입니다.
        </p>
        <p className="text-sm leading-relaxed text-zinc-600">
          owner/coach는 로그인 후 소속 테넌트 홈으로 자동 이동해 운영을 시작할 수 있습니다.
          일반 사용자 로그인은 별도 경로로 순차 오픈 예정입니다.
        </p>
      </div>
    </section>
  );
}
