"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteOfflineClassAction,
  toggleOfflineClassPublishedAction,
  updateOfflineClassAction,
} from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { uploadOfflineClassContentImage, uploadOfflineClassThumbnailImage } from "@/components/admin/offline-class-image-upload";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminCoachProfileRow, OfflineClassWithParticipants } from "@/lib/admin/types";

type OfflineClassEditFormProps = {
  offlineClass: OfflineClassWithParticipants;
  availableCoaches: AdminCoachProfileRow[];
};

function getOfflineClassStatusLabel(status: OfflineClassWithParticipants["status"]) {
  if (status === "pre_open") {
    return "오픈 전";
  }
  if (status === "closed") {
    return "마감";
  }
  return "오픈";
}

function toLocalDateTimeInputValue(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export function OfflineClassEditForm({ offlineClass, availableCoaches }: OfflineClassEditFormProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const offlineClassesPath = `${tenantBasePath}/admin/offline-classes`;
  const [isPending, startTransition] = useTransition();
  const [isThumbnailPending, startThumbnailTransition] = useTransition();
  const tenantSlug = useTenantSlug();
  const [contentHtml, setContentHtml] = useState(offlineClass.content_html);
  const [thumbnailUrl, setThumbnailUrl] = useState(offlineClass.thumbnail_url ?? "");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("id", offlineClass.id);
    formData.set("contentHtml", contentHtml);
    formData.set("thumbnailUrl", thumbnailUrl);

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

  const handleThumbnailFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startThumbnailTransition(async () => {
      try {
        const uploadedUrl = await uploadOfflineClassThumbnailImage(croppedFile, offlineClass.id);
        setThumbnailUrl(uploadedUrl);
        setIsCropDialogOpen(false);
        setCropSourceFile(null);
        toast.success("대표 이미지가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "대표 이미지 업로드에 실패했습니다.");
      }
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("id", offlineClass.id);

    startTransition(async () => {
      const result = await deleteOfflineClassAction(formData);
      if (result.ok) {
        toast.success(result.message);
        push(offlineClassesPath);
        return;
      }

      toast.error(result.message);
    });
  };

  const handleTogglePublished = () => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
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
          <Badge variant={offlineClass.status === "open" ? "default" : "secondary"}>
            {getOfflineClassStatusLabel(offlineClass.status)}
          </Badge>
          <Badge variant="outline">
            참가 {offlineClass.participants.length}/{offlineClass.capacity}
          </Badge>
          <Badge variant={offlineClass.mobile_visibility === "public" ? "outline" : "secondary"}>
            {offlineClass.mobile_visibility === "public" ? "모바일 공개" : "모바일 비공개"}
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
            <Label htmlFor="status">상태</Label>
            <select
              id="status"
              name="status"
              defaultValue={offlineClass.status}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="pre_open">오픈 전</option>
              <option value="open">오픈</option>
              <option value="closed">마감</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coachProfileId">담당 코치</Label>
            <select
              id="coachProfileId"
              name="coachProfileId"
              defaultValue={offlineClass.coach_profile_id ?? ""}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="">담당 코치 없음</option>
              {availableCoaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobileVisibility">모바일 노출</Label>
            <select
              id="mobileVisibility"
              name="mobileVisibility"
              defaultValue={offlineClass.mobile_visibility}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="public">모바일 공개</option>
              <option value="private">모바일 비공개</option>
            </select>
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
          <div className="space-y-2 md:col-span-2">
            <Label>대표 이미지 (1:1)</Label>
            <div className="flex items-center gap-4 rounded-md border bg-zinc-50 p-3">
              <div className="relative size-16 overflow-hidden rounded-md border border-zinc-200 bg-white">
                <Image src={thumbnailUrl || "/logo.png"} alt="오프라인 클래스 대표 이미지" fill className="object-cover" />
              </div>
              <div className="space-y-2">
                <input
                  ref={thumbnailFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleThumbnailFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isThumbnailPending}
                  onClick={() => thumbnailFileRef.current?.click()}
                >
                  {isThumbnailPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {isThumbnailPending ? "업로드 중..." : "대표 이미지 업로드"}
                </Button>
              </div>
            </div>
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
          <Button type="button" variant="outline" disabled={isPending} onClick={() => push(offlineClassesPath)}>
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
                <p className="text-xs text-zinc-500">{formatAdminDateTime(participant.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isThumbnailPending}
        onOpenChange={setIsCropDialogOpen}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
