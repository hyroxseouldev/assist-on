import Image from "next/image";

import { Badge } from "@/components/ui/badge";

type UserAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function UserAuthPanel({ teamName, logoUrl }: UserAuthPanelProps) {
  return (
    <section className="space-y-6">
      

      <div className="space-y-4">
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Member Access</Badge>
        <p className="text-lg leading-relaxed text-zinc-800">초대받은 팀에 참여하려면 로그인하거나 가입해 주세요.</p>
        <p className="text-sm leading-relaxed text-zinc-600">
          로그인/가입 후 초대 링크가 자동으로 이어지며, 참여가 완료되면 해당 테넌트 홈으로 이동합니다.
        </p>
      </div>
    </section>
  );
}
