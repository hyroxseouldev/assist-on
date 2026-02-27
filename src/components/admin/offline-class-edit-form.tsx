"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteOfflineClassAction,
  toggleOfflineClassPublishedAction,
  updateOfflineClassAction,
} from "@/lib/admin/actions";
import { uploadOfflineClassContentImage } from "@/components/admin/offline-class-image-upload";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

type OfflineClassEditFormProps = {
  offlineClass: OfflineClassWithParticipants;
};

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

export function OfflineClassEditForm({ offlineClass }: OfflineClassEditFormProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const offlineClassesPath = `${tenantBasePath}/admin/offline-classes`;
  const [isPending, startTransition] = useTransition();
  const [contentHtml, setContentHtml] = useState(offlineClass.content_html);

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", offlineClass.id);
    formData.set("contentHtml", contentHtml);

    startTransition(async () => {
      const result = await updateOfflineClassAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("id", offlineClass.id);

    startTransition(async () => {
      const result = await deleteOfflineClassAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(offlineClassesPath);
        return;
      }

      toast.error(result.message);
    });
  };

  const handleTogglePublished = () => {
    const formData = new FormData();
    formData.set("id", offlineClass.id);
    formData.set("nextPublished", offlineClass.is_published ? "false" : "true");

    startTransition(async () => {
      const result = await toggleOfflineClassPublishedAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleUpdate}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={offlineClass.is_published ? "default" : "secondary"}>
            {offlineClass.is_published ? "공개" : "비공개"}
          </Badge>
          <Badge variant="outline">
            참가 {offlineClass.participants.length}/{offlineClass.capacity}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">제목</Label>
            <Input id="title" name="title" defaultValue={offlineClass.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationText">장소</Label>
            <Input id="locationText" name="locationText" defaultValue={offlineClass.location_text} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">정원</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={offlineClass.participants.length || 1}
              defaultValue={offlineClass.capacity}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startsAt">시작 시간</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toLocalDateTimeInputValue(offlineClass.starts_at)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endsAt">종료 시간</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              defaultValue={toLocalDateTimeInputValue(offlineClass.ends_at)}
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>클래스 설명</Label>
            <TiptapEditor
              value={contentHtml}
              onChange={setContentHtml}
              placeholder="클래스 내용을 입력하세요."
              onUploadImage={(file) => uploadOfflineClassContentImage(file, offlineClass.id)}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            수정 저장
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push(offlineClassesPath)}>
            목록으로
          </Button>
          <Button type="button" variant="secondary" disabled={isPending} onClick={handleTogglePublished}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {offlineClass.is_published ? "비공개 전환" : "공개 전환"}
          </Button>
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            삭제
          </Button>
        </div>
      </form>

      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
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
    </div>
  );
}
