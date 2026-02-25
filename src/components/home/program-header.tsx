import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKoreanDate } from "@/lib/training/date";
import type { CoachInfo, ProgramPeriod, TeamInfo } from "@/types/training";

type ProgramHeaderProps = {
  teamInfo: TeamInfo;
  coach: CoachInfo;
  period: ProgramPeriod;
};

function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDdayLabel(endDate: string) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = parseLocalDate(endDate);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((end.getTime() - todayStart.getTime()) / msPerDay);

  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return "D-Day";
  return `D+${Math.abs(diffDays)}`;
}

export function ProgramHeader({ teamInfo, coach, period }: ProgramHeaderProps) {
  const dday = getDdayLabel(period.endDate);

  return (
    <Card className="overflow-hidden border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <Image
                src="/xon_logo.jpg"
                alt="Assist On 로고"
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
          <div className="flex w-fit flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
              {formatKoreanDate(period.startDate)} - {formatKoreanDate(period.endDate)}
            </Badge>
            <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">{dday}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="leading-relaxed text-zinc-700">{teamInfo.description}</p>
        <p className="text-zinc-600">
          코치: <span className="font-semibold text-zinc-900">{coach.name}</span> (
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
