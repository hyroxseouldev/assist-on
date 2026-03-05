"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createNoticeAction } from "@/lib/admin/actions";
import { uploadNoticeContentImage, uploadNoticeThumbnailImage } from "@/components/admin/notice-image-upload";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";

export function NoticeCreateForm() {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const noticesPath = `${tenantBasePath}/admin/notices`;
  const [isPending, startTransition] = useTransition();
  const [isThumbnailPending, startThumbnailTransition] = useTransition();
  const [contentHtml, setContentHtml] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("contentHtml", contentHtml);
    formData.set("thumbnailUrl", thumbnailUrl);

    startTransition(async () => {
      const result = await createNoticeAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(noticesPath);
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
        const uploadedUrl = await uploadNoticeThumbnailImage(croppedFile);
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
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" placeholder="예: 4월 클래스 일정 공지" required />
      </div>

      <div className="space-y-2">
        <Label>본문</Label>
        <TiptapEditor
          value={contentHtml}
          onChange={setContentHtml}
          placeholder="공지 본문을 입력하세요."
          onUploadImage={(file) => uploadNoticeContentImage(file)}
        />
      </div>

      <div className="space-y-2">
        <Label>대표 이미지 (1:1)</Label>
        <div className="flex items-center gap-4 rounded-md border bg-zinc-50 p-3">
          <div className="relative size-16 overflow-hidden rounded-md border border-zinc-200 bg-white">
            <Image src={thumbnailUrl || "/xon_logo.jpg"} alt="공지 대표 이미지" fill className="object-cover" />
          </div>
          <div className="space-y-2">
            <input
              ref={thumbnailFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleThumbnailFileChange}
            />
            <Button type="button" variant="outline" size="sm" disabled={isThumbnailPending} onClick={() => thumbnailFileRef.current?.click()}>
              {isThumbnailPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {isThumbnailPending ? "업로드 중..." : "대표 이미지 업로드"}
            </Button>
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
          {isPending ? "등록 중..." : "공지 등록"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push(noticesPath)}>
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
