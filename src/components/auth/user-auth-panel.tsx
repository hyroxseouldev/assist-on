import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type UserAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function UserAuthPanel({ teamName, logoUrl }: UserAuthPanelProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center p-2">
        <div className="relative h-40 w-40 overflow-hidden rounded-xl bg-white p-2">
          <Image src={logoUrl} alt={`${teamName} 로고`} fill className="object-contain" sizes="160px" priority />
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tenant</p>
          <p className="text-lg font-semibold text-zinc-900">{teamName}</p>
        </div>
      </div>

      <div className="space-y-4 text-center">
        <Badge className="bg-zinc-900 text-white hover:bg-zinc-900">Member Access</Badge>
        <p className="text-lg leading-relaxed text-zinc-800">초대받은 구성원은 Google 계정으로 빠르게 로그인할 수 있어요.</p>
        <p className="text-sm leading-relaxed text-zinc-600">로그인 완료 후 초대 흐름이 자동으로 이어지고, 참여가 끝나면 테넌트로 이동합니다.</p>
      </div>
    </section>
  );
}
