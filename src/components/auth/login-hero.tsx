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
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Best Hyrox Team</Badge>
        <p className="text-lg leading-relaxed text-zinc-800">
          기록만을 위한 팀이 아니라, 서로의 동기를 켜고 끝까지 실행할 수 있도록 돕는 팀.
        </p>
        <p className="text-sm leading-relaxed text-zinc-600">
          Assist On은 완주를 넘어 레이스를 이해하고 실행하는 선수를 만듭니다.
          흔들리는 순간에도 다시 기준을 붙잡을 수 있도록, 오늘의 훈련을 함께 설계하고 끝까지 완수합니다.
        </p>
      </div>
    </section>
  );
}
