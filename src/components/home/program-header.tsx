import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachInfo, TeamInfo } from "@/types/training";

type ProgramHeaderProps = {
  teamInfo: TeamInfo;
  coach: CoachInfo;
};
export function ProgramHeader({ teamInfo, coach }: ProgramHeaderProps) {

  return (
    <Card className="overflow-hidden border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src={teamInfo.logoUrl || "/xon_logo.jpg"}
                alt={`${teamInfo.name} 로고`}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <CardTitle className="text-xl tracking-tight">{teamInfo.name}</CardTitle>
              <CardDescription className="mt-1 text-sm">{teamInfo.slogan}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="leading-relaxed text-zinc-700">{teamInfo.description}</p>
        <p className="text-zinc-600">
          <span className="inline-flex items-center gap-2 align-middle">
            {coach.imageUrl ? (
              <span className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                <Image src={coach.imageUrl} alt={`${coach.name} 코치 이미지`} fill className="object-cover" />
              </span>
            ) : null}
            코치: <span className="font-semibold text-zinc-900">{coach.name}</span>
          </span>{" "}
          (
          <a
            href={`https://instagram.com/${coach.instagram}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            @{coach.instagram}
          </a>
          )
        </p>
        {coach.career.length > 0 ? (
          <div className="space-y-1 text-zinc-600">
            {coach.career.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
