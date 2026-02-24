"use client";

import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createSessionAction, deleteSessionAction, updateSessionAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionRow } from "@/lib/admin/types";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(fromDateKey(dateKey));
}

export function SessionsCalendarManager({ programId, sessions }: { programId: string; sessions: SessionRow[] }) {
  const [isPending, startTransition] = useTransition();

  const todayKey = toDateKey(new Date());
  const initialDateKey = sessions[0]?.session_date ?? todayKey;
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  const sessionByDate = useMemo(() => {
    return new Map(sessions.map((session) => [session.session_date, session]));
  }, [sessions]);

  const selectedSession = sessionByDate.get(selectedDateKey) ?? null;

  const sessionDays = useMemo(() => {
    return sessions.map((session) => fromDateKey(session.session_date));
  }, [sessions]);

  const runWithToast = (message: string, action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const loadingId = toast.loading(message);
      const result = await action();

      if (result.ok) {
        toast.success(result.message, { id: loadingId });
      } else {
        toast.error(result.message, { id: loadingId });
      }
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast("세션 추가 중...", () => createSessionAction(formData));
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast("세션 수정 중...", () => updateSessionAction(formData));
  };

  const handleDelete = () => {
    if (!selectedSession) {
      return;
    }

    const formData = new FormData();
    formData.set("id", selectedSession.id);
    runWithToast("세션 삭제 중...", () => deleteSessionAction(formData));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>세션 캘린더</CardTitle>
          <CardDescription>날짜를 선택해 세션을 조회하고 수정하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={fromDateKey(selectedDateKey)}
            onSelect={(date) => {
              if (date) {
                setSelectedDateKey(toDateKey(date));
              }
            }}
            modifiers={{ hasSession: sessionDays }}
            modifiersClassNames={{ hasSession: "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500" }}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formatDateLabel(selectedDateKey)}</CardTitle>
          <CardDescription>
            {selectedSession ? "기존 세션을 수정하거나 삭제할 수 있습니다." : "해당 날짜에는 세션이 없습니다. 새 세션을 등록하세요."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedSession ? (
            <form key={selectedSession.id} className="space-y-3" onSubmit={handleUpdate}>
              <input type="hidden" name="id" value={selectedSession.id} />
              <input type="hidden" name="programId" value={programId} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">날짜</Label>
                  <Input id="sessionDate" name="sessionDate" type="date" defaultValue={selectedSession.session_date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week">주차</Label>
                  <Input id="week" name="week" type="number" defaultValue={selectedSession.week} min={1} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayLabel">요일 라벨</Label>
                  <Input id="dayLabel" name="dayLabel" defaultValue={selectedSession.day_label} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input id="title" name="title" defaultValue={selectedSession.title} required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="warmupPaces">워밍업 페이스(쉼표 구분)</Label>
                  <Input
                    id="warmupPaces"
                    name="warmupPaces"
                    defaultValue={selectedSession.warmup.paces.join(",")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetDistance">메인세트 거리</Label>
                  <Input
                    id="mainSetDistance"
                    name="mainSetDistance"
                    defaultValue={selectedSession.main_set.distance}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetPace">메인세트 페이스</Label>
                  <Input id="mainSetPace" name="mainSetPace" defaultValue={selectedSession.main_set.pace} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetRepetitions">반복 횟수</Label>
                  <Input
                    id="mainSetRepetitions"
                    name="mainSetRepetitions"
                    type="number"
                    min={1}
                    defaultValue={selectedSession.main_set.repetitions}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "수정 중..." : "세션 수정"}
                </Button>
                <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                  세션 삭제
                </Button>
                <Badge variant="secondary">등록됨</Badge>
              </div>
            </form>
          ) : (
            <form key={selectedDateKey} className="space-y-3" onSubmit={handleCreate}>
              <input type="hidden" name="programId" value={programId} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">날짜</Label>
                  <Input id="sessionDate" name="sessionDate" type="date" defaultValue={selectedDateKey} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="week">주차</Label>
                  <Input id="week" name="week" type="number" min={1} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dayLabel">요일 라벨</Label>
                  <Input id="dayLabel" name="dayLabel" placeholder="Tuesday" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input id="title" name="title" placeholder="3주차 화요일 운동" required />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="warmupPaces">워밍업 페이스(쉼표 구분)</Label>
                  <Input id="warmupPaces" name="warmupPaces" placeholder="5:30,5:20,5:10,5:00,4:50" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetDistance">메인세트 거리</Label>
                  <Input id="mainSetDistance" name="mainSetDistance" placeholder="400m" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetPace">메인세트 페이스</Label>
                  <Input id="mainSetPace" name="mainSetPace" placeholder="3:30" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainSetRepetitions">반복 횟수</Label>
                  <Input id="mainSetRepetitions" name="mainSetRepetitions" type="number" min={1} placeholder="10" required />
                </div>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? "추가 중..." : "세션 추가"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
