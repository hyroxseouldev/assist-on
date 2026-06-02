"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import {
  createSessionAction,
  deleteSessionAction,
  polishSessionContentAction,
  updateSessionAction,
  type PolishSessionContentActionResult,
} from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type SessionProgramOption = {
  id: string;
  label: string;
  thumbnailUrl: string | null;
  deliveryMode: "fixed_date" | "cohort_based";
  contentStartsOn: string | null;
  cohorts: Array<{ id: string; name: string; starts_on: string; is_default: boolean }>;
};

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

function getDateKeyDayDiff(fromDateKey: string, toDateKey: string) {
  const from = Date.parse(`${fromDateKey}T00:00:00Z`);
  const to = Date.parse(`${toDateKey}T00:00:00Z`);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0;
  }

  return Math.round((to - from) / 86_400_000);
}

function addDaysToDateTimeLocal(value: string, days: number) {
  const date = parseDateTimeLocal(value);
  if (!date) {
    return null;
  }

  date.setDate(date.getDate() + days);
  return date;
}

function formatDateTimePreview(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
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

function CohortPublishPreview({
  program,
  publishAt,
}: {
  program: SessionProgramOption;
  publishAt: string;
}) {
  if (program.deliveryMode !== "cohort_based") {
    return null;
  }

  if (!program.contentStartsOn) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        콘텐츠 기준 시작일이 없어 기수별 공개 시각을 계산할 수 없습니다.
      </p>
    );
  }

  if (program.cohorts.length === 0) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        등록된 기수가 없어 기수별 공개 시각을 계산할 수 없습니다.
      </p>
    );
  }

  const rows = program.cohorts.map((cohort) => {
    const offsetDays = getDateKeyDayDiff(program.contentStartsOn ?? cohort.starts_on, cohort.starts_on);
    const effectivePublishAt = addDaysToDateTimeLocal(publishAt, offsetDays);

    return {
      ...cohort,
      effectivePublishAt,
    };
  });

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-xs font-medium text-zinc-700">기수별 실제 공개 예정</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900">{row.name}</span>
              {row.is_default ? <Badge variant="secondary">기본</Badge> : null}
            </div>
            <p className="mt-1 text-zinc-600">
              {row.effectivePublishAt ? formatDateTimePreview(row.effectivePublishAt) : "공개 일시를 선택해 주세요."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublishScheduleField({
  fieldId,
  program,
  publishAt,
  onChange,
}: {
  fieldId: string;
  program: SessionProgramOption | null;
  publishAt: string;
  onChange: (nextValue: string) => void;
}) {
  const isCohortBased = program?.deliveryMode === "cohort_based";

  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={fieldId}>{isCohortBased ? "콘텐츠 기준 공개 일시" : "공개 일시"}</Label>
      <PublishAtField id={fieldId} value={publishAt} onChange={onChange} />
      {isCohortBased ? (
        <>
          <p className="text-xs text-zinc-500">
            기수제 프로그램에서는 이 일시를 콘텐츠 기준일 기준으로 저장하고, 각 기수 시작일에 맞춰 실제 공개 시간이 계산됩니다.
          </p>
          {program ? <CohortPublishPreview program={program} publishAt={publishAt} /> : null}
        </>
      ) : null}
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
  programs: SessionProgramOption[];
  initialDateKey: string;
  nowTimestamp: number;
}) {
  const router = useRouter();
  const tenantSlug = useTenantSlug();
  const isAiPolishEnabled = false;
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedDateKey, setSelectedDateKey] = useState(initialDateKey);

  const sessionByDate = useMemo(() => {
    return new Map(sessions.map((session) => [session.session_date, session]));
  }, [sessions]);

  const selectedSession = sessionByDate.get(selectedDateKey) ?? null;
  const [title, setTitle] = useState(selectedSession?.title ?? "");
  const [contentHtml, setContentHtml] = useState(selectedSession ? toSessionHtml(selectedSession) : defaultSessionHtml());
  const [sessionType, setSessionType] = useState<"training" | "rest">(selectedSession?.session_type ?? "training");
  const [publishMode, setPublishMode] = useState<PublishMode>(selectedSession ? resolvePublishMode(selectedSession, nowTimestamp) : "public_now");
  const [publishAt, setPublishAt] = useState(selectedSession ? toDateTimeLocalInputValue(selectedSession.publish_at) : "");
  const [sessionDateInput, setSessionDateInput] = useState(selectedSession?.session_date ?? selectedDateKey);
  const [aiResult, setAiResult] = useState<Extract<PolishSessionContentActionResult, { ok: true }> | null>(null);
  const [isAiPending, startAiTransition] = useTransition();

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

  const handlePolishSessionContent = () => {
    if (!contentHtml.trim()) {
      toast.error("AI로 첨삭할 세션 본문을 먼저 입력해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("currentTitle", title);
    formData.set("sessionType", sessionType);
    formData.set("rawContent", contentHtml);

    startAiTransition(async () => {
      const result = await polishSessionContentAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setAiResult(result);
      toast.success(result.message);
    });
  };

  const applyAiResult = () => {
    if (!aiResult) {
      return;
    }

    setTitle(aiResult.title);
    setContentHtml(aiResult.contentHtml);
    setAiResult(null);
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
                      src={program.thumbnailUrl || "/logo.png"}
                      alt={`${program.label} 썸네일`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 w-full flex-1">
                    <p className="line-clamp-2 text-[12px] font-medium leading-4 text-zinc-900 sm:truncate sm:text-sm sm:leading-5">{program.label}</p>
                    <p className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                      {isActive ? "선택됨" : "선택"} · {program.deliveryMode === "cohort_based" ? "기수제" : "고정 날짜"}
                    </p>
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
                  setTitle(nextSession?.title ?? "");
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
                  <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
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
                  <PublishScheduleField fieldId="publishAt" program={selectedProgram} publishAt={publishAt} onChange={setPublishAt} />
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label>세션 본문 {sessionType === "rest" ? <span className="text-xs text-zinc-500">(선택)</span> : null}</Label>
                    {isAiPolishEnabled ? (
                      <Button type="button" variant="outline" size="sm" onClick={handlePolishSessionContent} disabled={isAiPending || isPending}>
                        {isAiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        {isAiPending ? "첨삭 중..." : "AI 첨삭"}
                      </Button>
                    ) : null}
                  </div>
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
                  <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="오늘의 세션" required />
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
                  <PublishScheduleField fieldId="publishAt-new" program={selectedProgram} publishAt={publishAt} onChange={setPublishAt} />
                ) : null}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label>세션 본문 {sessionType === "rest" ? <span className="text-xs text-zinc-500">(선택)</span> : null}</Label>
                    {isAiPolishEnabled ? (
                      <Button type="button" variant="outline" size="sm" onClick={handlePolishSessionContent} disabled={isAiPending || isPending}>
                        {isAiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                        {isAiPending ? "첨삭 중..." : "AI 첨삭"}
                      </Button>
                    ) : null}
                  </div>
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

      <Dialog open={Boolean(aiResult)} onOpenChange={(open) => (!open ? setAiResult(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI 첨삭 결과</DialogTitle>
            <DialogDescription>결과를 확인한 뒤 제목과 본문에 적용할 수 있습니다.</DialogDescription>
          </DialogHeader>
          {aiResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-medium text-zinc-500">제안 제목</p>
                <p className="mt-1 font-semibold text-zinc-950">{aiResult.title}</p>
              </div>
              <article
                className="prose prose-zinc max-h-[420px] max-w-none overflow-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm [&_h2]:mt-0 [&_h2]:text-lg [&_h3]:text-base [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: aiResult.contentHtml }}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAiResult(null)}>
              취소
            </Button>
            <Button type="button" onClick={applyAiResult}>
              본문에 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
