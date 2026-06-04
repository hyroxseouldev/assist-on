"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createOfflineClassAction } from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { uploadOfflineClassContentImage, uploadOfflineClassThumbnailImage } from "@/components/admin/offline-class-image-upload";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { AdminCoachProfileRow } from "@/lib/admin/types";

type OfflineClassCreateFormProps = {
  availableCoaches: AdminCoachProfileRow[];
};

export function OfflineClassCreateForm({ availableCoaches }: OfflineClassCreateFormProps) {
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const offlineClassesPath = `${tenantBasePath}/admin/offline-classes`;
  const [isPending, startTransition] = useTransition();
  const [isThumbnailPending, startThumbnailTransition] = useTransition();
  const tenantSlug = useTenantSlug();
  const [contentHtml, setContentHtml] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("contentHtml", contentHtml);
    formData.set("thumbnailUrl", thumbnailUrl);

    startTransition(async () => {
      const result = await createOfflineClassAction(formData);
      if (result.ok) {
        toast.success(result.message);
        push(offlineClassesPath);
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
        const uploadedUrl = await uploadOfflineClassThumbnailImage(croppedFile);
        setThumbnailUrl(uploadedUrl);
        setIsCropDialogOpen(false);
        setCropSourceFile(null);
        toast.success("대표 이미지가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "대표 이미지 업로드에 실패했습니다.");
      }
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleCreate}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">제목</Label>
          <Input id="title" name="title" placeholder="예: 토요일 러닝/워크아웃 클래스" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="locationText">장소</Label>
          <Input id="locationText" name="locationText" placeholder="예: 잠실 종합운동장 보조트랙" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">정원</Label>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={10} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">상태</Label>
          <select
            id="status"
            name="status"
            defaultValue="open"
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
            defaultValue="public"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="public">모바일 공개</option>
            <option value="private">모바일 비공개</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startsAt">시작 시간</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">종료 시간</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>클래스 설명</Label>
          <TiptapEditor
            value={contentHtml}
            onChange={setContentHtml}
            placeholder="클래스 내용을 입력하세요."
            onUploadImage={(file) => uploadOfflineClassContentImage(file)}
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
        <input type="checkbox" name="isPublished" value="true" defaultChecked className="size-4 accent-emerald-600" />
        작성 후 바로 공개
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "등록 중..." : "클래스 등록"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => push(offlineClassesPath)}>
          취소
        </Button>
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isThumbnailPending}
        onOpenChange={setIsCropDialogOpen}
        onConfirm={handleCropConfirm}
      />
    </form>
  );
}
