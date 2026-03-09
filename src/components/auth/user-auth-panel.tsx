import Image from "next/image";

type UserAuthPanelProps = {
  teamName: string;
  logoUrl: string;
};

export function UserAuthPanel({ teamName, logoUrl }: UserAuthPanelProps) {
  return (
    <section className="space-y-4 text-center">
      <div className="flex flex-col items-center">
        <div className="relative h-28 w-28 overflow-hidden rounded-[32px] bg-white p-2 shadow-sm ring-1 ring-zinc-200">
          <Image src={logoUrl} alt={`${teamName} 로고`} fill className="object-contain" sizes="160px" priority />
        </div>
        <div className="mt-4 space-y-1.5">
          <p className="text-[28px] font-semibold tracking-tight text-zinc-950">{teamName}</p>
          <p className="text-sm leading-5 text-zinc-500">Google 계정으로 빠르게 로그인하고 바로 시작하세요.</p>
        </div>
      </div>
    </section>
  );
}
