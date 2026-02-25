"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { createSessionAction, deleteSessionAction, updateSessionAction } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionRow } from "@/lib/admin/types";

const TiptapEditor = dynamic(() => import("@/components/admin/tiptap-editor").then((mod) => mod.TiptapEditor), {
  ssr: false,
  loading: () => <div className="min-h-56 rounded-md border border-input bg-background" />,
});

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

function toSessionHtml(session: SessionRow) {
  return session.content_html || defaultSessionHtml();
}

function defaultSessionHtml() {
  return "<h3>Warmup</h3><p>러닝 페이스 빌드업</p><ul><li>5:30 /km</li><li>5:20 /km</li></ul><h3>Main Set</h3><p>400m x 10회</p><p>목표 페이스: 3:30 /km</p>";
}

export function SessionsCalendarManager({ programId, sessions }: { programId: string; sessions: SessionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const todayKey = toDateKey(new Date());
  const initialDateKey = sessions[0]?.session_date ?? todayKey;
  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  const sessionByDate = useMemo(() => {
    return new Map(sessions.map((session) => [session.session_date, session]));
  }, [sessions]);

  const selectedSession = sessionByDate.get(selectedDateKey) ?? null;
  const [contentHtml, setContentHtml] = useState(selectedSession ? toSessionHtml(selectedSession) : defaultSessionHtml());

  const sessionDays = useMemo(() => {
    return sessions.map((session) => fromDateKey(session.session_date));
  }, [sessions]);

  const runWithToast = (message: string, action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
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
                const nextDateKey = toDateKey(date);
                setSelectedDateKey(nextDateKey);

                const nextSession = sessionByDate.get(nextDateKey);
                setContentHtml(nextSession ? toSessionHtml(nextSession) : defaultSessionHtml());
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
                  <Label>세션 본문</Label>
                  <TiptapEditor value={contentHtml} onChange={setContentHtml} placeholder="세션 내용을 자유롭게 작성해 주세요." />
                  <input type="hidden" name="contentHtml" value={contentHtml} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isPending ? "수정 중..." : "세션 수정"}
                </Button>
                <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
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
                  <Label>세션 본문</Label>
                  <TiptapEditor value={contentHtml} onChange={setContentHtml} placeholder="세션 내용을 자유롭게 작성해 주세요." />
                  <input type="hidden" name="contentHtml" value={contentHtml} />
                </div>
              </div>

              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isPending ? "추가 중..." : "세션 추가"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
