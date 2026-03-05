"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteNoticeAction,
  toggleNoticePublishedAction,
  updateNoticeAction,
} from "@/lib/admin/actions";
import { uploadNoticeContentImage, uploadNoticeThumbnailImage } from "@/components/admin/notice-image-upload";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { NoticeRow } from "@/lib/admin/types";

type NoticeEditFormProps = {
  notice: NoticeRow;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NoticeEditForm({ notice }: NoticeEditFormProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const noticesPath = `${tenantBasePath}/admin/notices`;
  const [isPending, startTransition] = useTransition();
  const [isThumbnailPending, startThumbnailTransition] = useTransition();
  const [contentHtml, setContentHtml] = useState(notice.content_html);
  const [thumbnailUrl, setThumbnailUrl] = useState(notice.thumbnail_url);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", notice.id);
    formData.set("contentHtml", contentHtml);
    formData.set("thumbnailUrl", thumbnailUrl);

    startTransition(async () => {
      const result = await updateNoticeAction(formData);
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
        const uploadedUrl = await uploadNoticeThumbnailImage(croppedFile, notice.id);
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
    formData.set("id", notice.id);

    startTransition(async () => {
      const result = await deleteNoticeAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(noticesPath);
        return;
      }

      toast.error(result.message);
    });
  };

  const handleTogglePublished = () => {
    const formData = new FormData();
    formData.set("id", notice.id);
    formData.set("nextPublished", notice.is_published ? "false" : "true");

    startTransition(async () => {
      const result = await toggleNoticePublishedAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleUpdate}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={notice.is_published ? "default" : "secondary"}>
          {notice.is_published ? "공개" : "비공개"}
        </Badge>
        <p className="text-xs text-zinc-500">생성: {formatDateTime(notice.created_at)}</p>
        <p className="text-xs text-zinc-500">수정: {formatDateTime(notice.updated_at)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" defaultValue={notice.title} required />
      </div>

      <div className="space-y-2">
        <Label>본문</Label>
        <TiptapEditor
          value={contentHtml}
          onChange={setContentHtml}
          placeholder="공지 본문을 입력하세요."
          onUploadImage={(file) => uploadNoticeContentImage(file, notice.id)}
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
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={notice.is_published}
          className="size-4 accent-emerald-600"
        />
        공개 상태로 저장
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          수정 저장
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push(noticesPath)}>
          목록으로
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleTogglePublished}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {notice.is_published ? "비공개 전환" : "공개 전환"}
        </Button>
        <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          삭제
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
