import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type TenantAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function TenantAuthPanel({ teamName, logoUrl }: TenantAuthPanelProps) {
  return (
    <section className="space-y-5 text-center">
      <div className="flex justify-center">
        <Badge className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-amber-700 uppercase hover:bg-amber-50">
          Tenant Admin
        </Badge>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white p-3 shadow-[0_14px_32px_rgba(24,24,27,0.08)]">
          <Image src={logoUrl} alt={`${teamName} 로고`} fill className="object-contain" sizes="160px" priority />
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-[28px] font-semibold tracking-tight text-zinc-950">{teamName}</p>
          <p className="text-sm leading-6 text-zinc-500">모바일 앱처럼 간결한 흐름으로, 운영자 계정만 빠르게 로그인할 수 있어요.</p>
        </div>
      </div>

      <div className="rounded-[28px] bg-zinc-50 px-4 py-4 text-left">
        <p className="text-sm font-semibold text-zinc-900">이 로그인은 owner / coach 전용이에요.</p>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          로그인 후 소속 테넌트 어드민 홈으로 이동하고, 공지/세션/커뮤니티/멤버 관리 기능을 바로 사용할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
