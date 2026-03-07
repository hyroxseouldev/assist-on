import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type TenantAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function TenantAuthPanel({ teamName, logoUrl }: TenantAuthPanelProps) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center p-2">
        <div className="relative h-40 w-40 overflow-hidden rounded-xl bg-white p-2">
          <Image src={logoUrl} alt={`${teamName} 로고`} fill className="object-contain" sizes="160px" priority />
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tenant Admin</p>
          <p className="text-lg font-semibold text-zinc-900">{teamName}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Badge className="bg-zinc-900 text-white hover:bg-zinc-900">Tenant Access</Badge>
        <p className="text-lg leading-relaxed text-zinc-800">테넌트 운영자(owner/coach) 전용 로그인입니다.</p>
        <p className="text-sm leading-relaxed text-zinc-600">
          로그인 후 소속 테넌트 어드민 홈으로 이동하며, 공지/세션/커뮤니티/멤버 운영 기능을 바로 사용할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
