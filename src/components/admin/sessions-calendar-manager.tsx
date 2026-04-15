"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { CalendarIcon, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { createSessionAction, deleteSessionAction, updateSessionAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";

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

function resolvePublishMode(session: SessionRow | null, nowTimestamp: number): PublishMode {
  if (!session?.is_published) {
    return "private";
  }

  if (session.publish_at && Date.parse(session.publish_at) > nowTimestamp) {
    return "scheduled";
  }

  return "public_now";
}

function parseDateTimeLocal(value: string) {
  if (!value) {
    return null;
  }

  const [datePart, timePart = "00:00"] = value.split("T");
  const [yearText, monthText, dayText] = datePart.split("-");
  const [hourText, minuteText] = timePart.split(":");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute);
}

function toDateTimeLocalValue(date: Date) {
  const timeHour = `${date.getHours()}`.padStart(2, "0");
  const timeMinute = `${date.getMinutes()}`.padStart(2, "0");
  return `${toDateKey(date)}T${timeHour}:${timeMinute}`;
}

function formatPublishAtLabel(value: string) {
  const date = parseDateTimeLocal(value);

  if (!date) {
    return "날짜를 선택하세요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function PublishAtField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const selected = parseDateTimeLocal(value);
  const selectedTime = selected
    ? `${`${selected.getHours()}`.padStart(2, "0")}:${`${selected.getMinutes()}`.padStart(2, "0")}`
    : "09:00";

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_130px]">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`justify-start text-left font-normal ${selected ? "text-foreground" : "text-muted-foreground"}`}
          >
            <CalendarIcon className="mr-2 size-4" />
            {formatPublishAtLabel(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(date) => {
              if (!date) {
                return;
              }

              const base = selected ?? new Date();
              onChange(toDateTimeLocalValue(new Date(date.getFullYear(), date.getMonth(), date.getDate(), base.getHours(), base.getMinutes())));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        name={`${id}Visible`}
        type="time"
        value={selectedTime}
        onChange={(event) => {
          const [hourText, minuteText] = event.target.value.split(":");
          const hour = Number(hourText);
          const minute = Number(minuteText);

          if (Number.isNaN(hour) || Number.isNaN(minute)) {
            return;
          }

          const base = selected ?? new Date();
          onChange(toDateTimeLocalValue(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute)));
        }}
        required
      />
    </div>
  );
}

function SessionDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 size-4" />
          {formatDateLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={fromDateKey(value)}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange(toDateKey(date));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function getPublishBadgeLabel(session: SessionRow, nowTimestamp: number) {
  if (!session.is_published) {
    return "비공개";
  }

  if (session.publish_at && Date.parse(session.publish_at) > nowTimestamp) {
    return "예약 공개";
  }

  return "공개";
}

export function SessionsCalendarManager({
  programId,
  sessions,
  programs,
  initialDateKey,
  nowTimestamp,
}: {
  programId: string;
  sessions: SessionRow[];
  programs: Array<{ id: string; label: string; thumbnailUrl: string | null }>;
  initialDateKey: string;
  nowTimestamp: number;
}) {
  const router = useRouter();
  const tenantSlug = useTenantSlug();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  const sessionByDate = useMemo(() => {
    return new Map(sessions.map((session) => [session.session_date, session]));
  }, [sessions]);

  const selectedSession = sessionByDate.get(selectedDateKey) ?? null;
  const [contentHtml, setContentHtml] = useState(selectedSession ? toSessionHtml(selectedSession) : defaultSessionHtml());
  const [sessionType, setSessionType] = useState<"training" | "rest">(selectedSession?.session_type ?? "training");
  const [publishMode, setPublishMode] = useState<PublishMode>(selectedSession ? resolvePublishMode(selectedSession, nowTimestamp) : "public_now");
  const [publishAt, setPublishAt] = useState(selectedSession ? toDateTimeLocalInputValue(selectedSession.publish_at) : "");
  const [sessionDateInput, setSessionDateInput] = useState(selectedSession?.session_date ?? selectedDateKey);

  const sessionDays = useMemo(() => {
    return sessions.map((session) => fromDateKey(session.session_date));
  }, [sessions]);

  const selectedProgram = useMemo(() => {
    return programs.find((program) => program.id === programId) ?? null;
  }, [programId, programs]);

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
    push(`${pathname}?${params.toString()}`);
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
    formData.set("tenantSlug", tenantSlug ?? "");
    runWithToast(() => createSessionAction(formData));
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    runWithToast(() => updateSessionAction(formData));
  };

  const handleDelete = () => {
    if (!selectedSession) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("id", selectedSession.id);
    runWithToast(() => deleteSessionAction(formData));
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>프로그램</Label>
        <ScrollArea className="mt-2 w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {programs.map((program) => {
              const isActive = program.id === programId;

              return (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => handleProgramChange(program.id)}
                  className={cn(
                    "flex w-[112px] shrink-0 flex-col items-start gap-2 rounded-xl border bg-white p-2 text-left transition-colors sm:w-[220px] sm:flex-row sm:items-center sm:gap-3 sm:p-3",
                    isActive ? "border-zinc-900 bg-zinc-50 shadow-sm" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                  aria-pressed={isActive}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-white sm:size-14 sm:w-auto sm:shrink-0">
                    <Image
                      src={program.thumbnailUrl || "/xon_logo.jpg"}
                      alt={`${program.label} 썸네일`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 w-full flex-1">
                    <p className="line-clamp-2 text-[12px] font-medium leading-4 text-zinc-900 sm:truncate sm:text-sm sm:leading-5">{program.label}</p>
                    <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">{isActive ? "선택됨" : "선택"}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Card>
          <CardContent className="pt-6">
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
                  setPublishMode(nextSession ? resolvePublishMode(nextSession, nowTimestamp) : "public_now");
                  setPublishAt(nextSession ? toDateTimeLocalInputValue(nextSession.publish_at) : "");
                  setSessionDateInput(nextSession?.session_date ?? nextDateKey);
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
          {selectedProgram ? <Badge variant="outline" className="w-fit">{selectedProgram.label}</Badge> : null}
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
                  <SessionDateField id="sessionDate" value={sessionDateInput} onChange={setSessionDateInput} />
                  <input type="hidden" name="sessionDate" value={sessionDateInput} />
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
                    <PublishAtField id="publishAt" value={publishAt} onChange={setPublishAt} />
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
                <Badge variant={selectedSession.is_published ? "default" : "secondary"}>{getPublishBadgeLabel(selectedSession, nowTimestamp)}</Badge>
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
                  <Label htmlFor="sessionDate-new">날짜</Label>
                  <SessionDateField id="sessionDate-new" value={sessionDateInput} onChange={setSessionDateInput} />
                  <input type="hidden" name="sessionDate" value={sessionDateInput} />
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
                    <PublishAtField id="publishAt-new" value={publishAt} onChange={setPublishAt} />
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
    </div>
  );
}
