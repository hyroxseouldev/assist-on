"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createOfflineClassAction,
  deleteOfflineClassAction,
  toggleOfflineClassPublishedAction,
  updateOfflineClassAction,
} from "@/app/(admin)/admin/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type OfflineClassesManagerProps = {
  classes: OfflineClassWithParticipants[];
};

export function OfflineClassesManager({ classes }: OfflineClassesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftContent, setDraftContent] = useState("");
  const [contentById, setContentById] = useState<Record<string, string>>(
    Object.fromEntries(classes.map((offlineClass) => [offlineClass.id, offlineClass.content_html]))
  );

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

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("contentHtml", draftContent);

    runWithToast(async () => {
      const result = await createOfflineClassAction(formData);
      if (result.ok) {
        form.reset();
        setDraftContent("");
      }
      return result;
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", id);
    formData.set("contentHtml", contentById[id] ?? "");
    runWithToast(() => updateOfflineClassAction(formData));
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    runWithToast(() => deleteOfflineClassAction(formData));
  };

  const handleTogglePublished = (id: string, nextPublished: boolean) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("nextPublished", nextPublished ? "true" : "false");
    runWithToast(() => toggleOfflineClassPublishedAction(formData));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">오프라인 클래스 추가</h3>
        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="newTitle">제목</Label>
              <Input id="newTitle" name="title" placeholder="예: 토요일 러닝/워크아웃 클래스" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newLocation">장소</Label>
              <Input id="newLocation" name="locationText" placeholder="예: 잠실 종합운동장 보조트랙" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newCapacity">정원</Label>
              <Input id="newCapacity" name="capacity" type="number" min={1} defaultValue={10} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStartsAt">시작 시간</Label>
              <Input id="newStartsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndsAt">종료 시간</Label>
              <Input id="newEndsAt" name="endsAt" type="datetime-local" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>클래스 설명</Label>
              <TiptapEditor value={draftContent} onChange={setDraftContent} placeholder="클래스 내용을 입력하세요." />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="isPublished" value="true" defaultChecked className="size-4 accent-emerald-600" />
            작성 후 바로 공개
          </label>

          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "등록 중..." : "클래스 등록"}
          </Button>
        </form>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">클래스 목록</h3>

        {classes.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 오프라인 클래스가 없습니다.</p>
        ) : (
          <div className="space-y-5">
            {classes.map((offlineClass) => (
              <form key={offlineClass.id} className="space-y-3 rounded-lg border border-zinc-200 p-4" onSubmit={(event) => handleUpdate(event, offlineClass.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={offlineClass.is_published ? "default" : "secondary"}>
                    {offlineClass.is_published ? "공개" : "비공개"}
                  </Badge>
                  <Badge variant="outline">
                    참가 {offlineClass.participants.length}/{offlineClass.capacity}
                  </Badge>
                  <p className="text-xs text-zinc-500">시작: {formatDateTime(offlineClass.starts_at)}</p>
                  <p className="text-xs text-zinc-500">종료: {formatDateTime(offlineClass.ends_at)}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`title-${offlineClass.id}`}>제목</Label>
                    <Input id={`title-${offlineClass.id}`} name="title" defaultValue={offlineClass.title} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`location-${offlineClass.id}`}>장소</Label>
                    <Input id={`location-${offlineClass.id}`} name="locationText" defaultValue={offlineClass.location_text} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`capacity-${offlineClass.id}`}>정원</Label>
                    <Input
                      id={`capacity-${offlineClass.id}`}
                      name="capacity"
                      type="number"
                      min={offlineClass.participants.length || 1}
                      defaultValue={offlineClass.capacity}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`startsAt-${offlineClass.id}`}>시작 시간</Label>
                    <Input
                      id={`startsAt-${offlineClass.id}`}
                      name="startsAt"
                      type="datetime-local"
                      defaultValue={toLocalDateTimeInputValue(offlineClass.starts_at)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`endsAt-${offlineClass.id}`}>종료 시간</Label>
                    <Input
                      id={`endsAt-${offlineClass.id}`}
                      name="endsAt"
                      type="datetime-local"
                      defaultValue={toLocalDateTimeInputValue(offlineClass.ends_at)}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>클래스 설명</Label>
                    <TiptapEditor
                      value={contentById[offlineClass.id] ?? ""}
                      onChange={(value) => setContentById((prev) => ({ ...prev, [offlineClass.id]: value }))}
                      placeholder="클래스 내용을 입력하세요."
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    name="isPublished"
                    value="true"
                    defaultChecked={offlineClass.is_published}
                    className="size-4 accent-emerald-600"
                  />
                  공개 상태로 저장
                </label>

                <div className="space-y-2 rounded-md bg-zinc-50 p-3">
                  <p className="text-xs font-medium tracking-wide text-zinc-600">참가자 목록</p>
                  {offlineClass.participants.length === 0 ? (
                    <p className="text-sm text-zinc-500">신청한 참가자가 없습니다.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {offlineClass.participants.map((participant) => (
                        <li key={participant.id} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-sm">
                          <p className="text-zinc-800">{participant.participant_name}</p>
                          <p className="text-xs text-zinc-500">{formatDateTime(participant.created_at)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" variant="outline" disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    수정 저장
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleTogglePublished(offlineClass.id, !offlineClass.is_published)}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {offlineClass.is_published ? "비공개 전환" : "공개 전환"}
                  </Button>
                  <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleDelete(offlineClass.id)}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    삭제
                  </Button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
