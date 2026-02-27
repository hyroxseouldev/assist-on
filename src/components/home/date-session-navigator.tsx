"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SessionCard } from "@/components/home/session-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  addDays,
  formatKoreanDate,
  getTodayDateKey,
  isValidDateKey,
} from "@/lib/training/date";
import type { ProgramPeriod, Session } from "@/types/training";

type DateSessionNavigatorProps = {
  sessions: Session[];
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

export function DateSessionNavigator({ sessions, period }: DateSessionNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const sessionByDate = useMemo(
    () => new Map(sessions.map((session) => [session.date, session])),
    [sessions]
  );

  const dateFromQuery = searchParams.get("date");
  const selectedDateKey =
    dateFromQuery && isValidDateKey(dateFromQuery) ? dateFromQuery : todayDateKey;
  const resolvedDateKey = selectedDateKey;
  const selectedSession = sessionByDate.get(resolvedDateKey) ?? null;
  const isToday = resolvedDateKey === todayDateKey;

  const canGoPrev = resolvedDateKey > period.startDate;
  const canGoNext = resolvedDateKey < period.endDate;
  const dday = getDdayLabel(period.endDate);

  const updateDateInQuery = (nextDateKey: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextDateKey === todayDateKey) {
      nextParams.delete("date");
    } else {
      nextParams.set("date", nextDateKey);
    }

    const query = nextParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  const moveDate = (offset: number) => {
    updateDateInQuery(addDays(resolvedDateKey, offset));
  };

  return (
    <section className="space-y-4">
      <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center gap-2 py-3">
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
            프로그램 기간: {formatKoreanDate(period.startDate)} - {formatKoreanDate(period.endDate)}
          </Badge>
          <Badge className="bg-emerald-700 text-white hover:bg-emerald-700">{dday}</Badge>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
        <CardContent className="flex items-center justify-between gap-2 py-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => moveDate(-1)}
            aria-label="이전 날짜"
            disabled={!canGoPrev}
          >
            <ChevronLeft />
          </Button>

          <div className="text-center">
            <p className="text-sm font-medium text-zinc-900">{formatKoreanDate(resolvedDateKey)}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {isToday ? <Badge>Today</Badge> : null}
              {!isToday ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateDateInQuery(todayDateKey)}
                  aria-label="오늘 날짜로 이동"
                >
                  오늘로 이동
                </Button>
              ) : null}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => moveDate(1)}
            aria-label="다음 날짜"
            disabled={!canGoNext}
          >
            <ChevronRight />
          </Button>
        </CardContent>
      </Card>

      <SessionCard session={selectedSession} isToday={isToday} />
    </section>
  );
}
