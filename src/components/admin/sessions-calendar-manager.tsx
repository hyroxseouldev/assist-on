"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { createSessionAction, deleteSessionAction, updateSessionAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  return "";
}

type PublishMode = "private" | "public_now" | "scheduled";

function toDateTimeLocalInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function resolvePublishMode(session: SessionRow | null): PublishMode {
  if (!session?.is_published) {
    return "private";
  }

  if (session.publish_at && Date.parse(session.publish_at) > Date.now()) {
    return "scheduled";
  }

  return "public_now";
}

function getPublishBadgeLabel(session: SessionRow) {
  if (!session.is_published) {
    return "비공개";
  }

  if (session.publish_at && Date.parse(session.publish_at) > Date.now()) {
    return "예약 공개";
  }

  return "공개";
}

export function SessionsCalendarManager({
  programId,
  sessions,
  programs,
}: {
  programId: string;
  sessions: SessionRow[];
  programs: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const todayKey = toDateKey(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const sessionByDate = useMemo(() => {
    return new Map(sessions.map((session) => [session.session_date, session]));
  }, [sessions]);

  const selectedSession = sessionByDate.get(selectedDateKey) ?? null;
  const [contentHtml, setContentHtml] = useState(selectedSession ? toSessionHtml(selectedSession) : defaultSessionHtml());
  const [sessionType, setSessionType] = useState<"training" | "rest">(selectedSession?.session_type ?? "training");
  const [publishMode, setPublishMode] = useState<PublishMode>(selectedSession ? resolvePublishMode(selectedSession) : "public_now");
  const [publishAt, setPublishAt] = useState(selectedSession ? toDateTimeLocalInputValue(selectedSession.publish_at) : "");

  const sessionDays = useMemo(() => {
    return sessions.map((session) => fromDateKey(session.session_date));
  }, [sessions]);

  const runWithToast = (action: () => Promise<{ ok: boolean; message: string }>) => {
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

  const handleProgramChange = (nextProgramId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("programId", nextProgramId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleUploadImage = async (file: File) => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("이미지 업로드를 위해 로그인이 필요합니다.");
    }

    const uploaded = await uploadImageToStorage(file, {
      bucket: "content-media",
      userId: user.id,
      domainFolder: "sessions",
      maxDimension: 1600,
      quality: 0.8,
    });

    const metaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "session_content",
      domainId: selectedSession?.id,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
    });

    if (!metaResult.ok) {
      throw new Error(metaResult.message);
    }

    return uploaded.publicUrl;
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast(() => createSessionAction(formData));
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast(() => updateSessionAction(formData));
  };

  const handleDelete = () => {
    if (!selectedSession) {
      return;
    }

    const formData = new FormData();
    formData.set("id", selectedSession.id);
    runWithToast(() => deleteSessionAction(formData));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>세션 캘린더</CardTitle>
          <CardDescription>날짜를 선택해 세션을 조회하고 수정하세요.</CardDescription>
          <div className="pt-2">
            <Label htmlFor="session-program">프로그램</Label>
            <Select value={programId} onValueChange={handleProgramChange}>
              <SelectTrigger id="session-program" className="mt-2">
                <SelectValue placeholder="프로그램 선택" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                setSessionType(nextSession?.session_type ?? "training");
                setPublishMode(nextSession ? resolvePublishMode(nextSession) : "public_now");
                setPublishAt(nextSession ? toDateTimeLocalInputValue(nextSession.publish_at) : "");
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
              <input type="hidden" name="sessionType" value={sessionType} />
              <input type="hidden" name="isPublished" value={publishMode === "private" ? "false" : "true"} />
              <input type="hidden" name="publishAt" value={publishMode === "scheduled" ? publishAt : ""} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">날짜</Label>
                  <Input id="sessionDate" name="sessionDate" type="date" defaultValue={selectedSession.session_date} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input id="title" name="title" defaultValue={selectedSession.title} required />
                </div>
                <div className="space-y-2">
                  <Label>세션 타입</Label>
                  <Select value={sessionType} onValueChange={(value) => setSessionType(value as "training" | "rest")}>
                    <SelectTrigger>
                      <SelectValue placeholder="세션 타입" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">트레이닝</SelectItem>
                      <SelectItem value="rest">휴식</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>공개 설정</Label>
                  <Select value={publishMode} onValueChange={(value) => setPublishMode(value as PublishMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="공개 설정" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">비공개</SelectItem>
                      <SelectItem value="public_now">즉시 공개</SelectItem>
                      <SelectItem value="scheduled">예약 공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {publishMode === "scheduled" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="publishAt">공개 일시</Label>
                    <Input
                      id="publishAt"
                      name="publishAtVisible"
                      type="datetime-local"
                      value={publishAt}
                      onChange={(event) => setPublishAt(event.target.value)}
                      required
                    />
                  </div>
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <Label>세션 본문 {sessionType === "rest" ? <span className="text-xs text-zinc-500">(선택)</span> : null}</Label>
                  <TiptapEditor
                    key={selectedSession?.id ?? selectedDateKey}
                    value={contentHtml}
                    onChange={setContentHtml}
                    placeholder={sessionType === "rest" ? "휴식 가이드가 있다면 작성해 주세요." : "세션 내용을 자유롭게 작성해 주세요."}
                    onUploadImage={handleUploadImage}
                  />
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
                <Badge variant={selectedSession.is_published ? "default" : "secondary"}>{getPublishBadgeLabel(selectedSession)}</Badge>
                {selectedSession.session_type === "rest" ? <Badge variant="outline">휴식</Badge> : null}
              </div>
            </form>
          ) : (
            <form key={selectedDateKey} className="space-y-3" onSubmit={handleCreate}>
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="sessionType" value={sessionType} />
              <input type="hidden" name="isPublished" value={publishMode === "private" ? "false" : "true"} />
              <input type="hidden" name="publishAt" value={publishMode === "scheduled" ? publishAt : ""} />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sessionDate">날짜</Label>
                  <Input id="sessionDate" name="sessionDate" type="date" defaultValue={selectedDateKey} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">제목</Label>
                  <Input id="title" name="title" placeholder="오늘의 세션" required />
                </div>
                <div className="space-y-2">
                  <Label>세션 타입</Label>
                  <Select value={sessionType} onValueChange={(value) => setSessionType(value as "training" | "rest")}>
                    <SelectTrigger>
                      <SelectValue placeholder="세션 타입" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">트레이닝</SelectItem>
                      <SelectItem value="rest">휴식</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>공개 설정</Label>
                  <Select value={publishMode} onValueChange={(value) => setPublishMode(value as PublishMode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="공개 설정" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">비공개</SelectItem>
                      <SelectItem value="public_now">즉시 공개</SelectItem>
                      <SelectItem value="scheduled">예약 공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {publishMode === "scheduled" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="publishAt-new">공개 일시</Label>
                    <Input
                      id="publishAt-new"
                      name="publishAtVisible"
                      type="datetime-local"
                      value={publishAt}
                      onChange={(event) => setPublishAt(event.target.value)}
                      required
                    />
                  </div>
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <Label>세션 본문 {sessionType === "rest" ? <span className="text-xs text-zinc-500">(선택)</span> : null}</Label>
                  <TiptapEditor
                    key={selectedDateKey}
                    value={contentHtml}
                    onChange={setContentHtml}
                    placeholder={sessionType === "rest" ? "휴식 가이드가 있다면 작성해 주세요." : "세션 내용을 자유롭게 작성해 주세요."}
                    onUploadImage={handleUploadImage}
                  />
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
