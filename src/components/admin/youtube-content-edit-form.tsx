"use client";

import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteYoutubeContentAction,
  toggleYoutubeContentPublishedAction,
  updateYoutubeContentAction,
} from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { uploadYoutubePreviewVideo } from "@/components/admin/youtube-preview-video-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { YoutubeContentRow } from "@/lib/admin/types";

type YoutubeContentEditFormProps = {
  tenantSlug: string;
  content: YoutubeContentRow;
};

export function YoutubeContentEditForm({ tenantSlug, content }: YoutubeContentEditFormProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const contentsPath = `${tenantBasePath}/admin/youtube`;
  const [isPending, startTransition] = useTransition();
  const [isPreviewUploading, setIsPreviewUploading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState(content.preview_video_url ?? "");
  const [previewVideoMimeType, setPreviewVideoMimeType] = useState(content.preview_video_mime_type ?? "");
  const previewFileRef = useRef<HTMLInputElement>(null);

  const isMobilePublic = content.mobile_visibility === "public";

  const handlePreviewFileChange = async (file: File | undefined) => {
    if (!file) return;

    setIsPreviewUploading(true);
    try {
      const uploaded = await uploadYoutubePreviewVideo(file, content.id);
      setPreviewVideoUrl(uploaded.publicUrl);
      setPreviewVideoMimeType(uploaded.mimeType);
      toast.success("미리보기 영상이 업로드되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "미리보기 영상 업로드에 실패했습니다.";
      toast.error(message);
    } finally {
      setIsPreviewUploading(false);
      if (previewFileRef.current) {
        previewFileRef.current.value = "";
      }
    }
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", content.id);

    startTransition(async () => {
      const result = await updateYoutubeContentAction(formData);
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
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", content.id);

    startTransition(async () => {
      const result = await deleteYoutubeContentAction(formData);
      if (result.ok) {
        toast.success(result.message);
        push(contentsPath);
        return;
      }

      toast.error(result.message);
    });
  };

  const handleTogglePublished = () => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", content.id);
    formData.set("nextPublished", isMobilePublic ? "false" : "true");

    startTransition(async () => {
      const result = await toggleYoutubeContentPublishedAction(formData);
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
        <Badge variant={isMobilePublic ? "default" : "secondary"}>
          {isMobilePublic ? "모바일 공개" : "모바일 비공개"}
        </Badge>
        <p className="text-xs text-zinc-500">생성: {formatAdminDateTime(content.created_at)}</p>
        <p className="text-xs text-zinc-500">수정: {formatAdminDateTime(content.updated_at)}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" defaultValue={content.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtubeUrl">유튜브 URL</Label>
        <div className="flex gap-2">
          <Input id="youtubeUrl" name="youtubeUrl" defaultValue={content.youtube_url} required />
          <Button type="button" variant="outline" size="icon" asChild>
            <a href={content.youtube_url} target="_blank" rel="noreferrer" aria-label="유튜브에서 열기">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" defaultValue={content.description} rows={4} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
          <Input id="thumbnailUrl" name="thumbnailUrl" defaultValue={content.thumbnail_url ?? ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">정렬값</Label>
          <Input id="displayOrder" name="displayOrder" type="number" inputMode="numeric" defaultValue={content.display_order} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mobileVisibility">모바일 공개</Label>
          <select
            id="mobileVisibility"
            name="mobileVisibility"
            defaultValue={content.mobile_visibility}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="public">공개 (저장 즉시 앱에 공개)</option>
            <option value="private">비공개</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">장르</Label>
          <Input id="genre" name="genre" defaultValue={content.genre} placeholder="예: 러닝, HYROX, 스트렝스" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">태그</Label>
        <Input id="tags" name="tags" defaultValue={content.tags.join(", ")} placeholder="쉼표로 구분해 입력하세요." />
      </div>

      <div className="space-y-2">
        <Label>미리보기 영상</Label>
        <input
          ref={previewFileRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(event) => handlePreviewFileChange(event.target.files?.[0])}
        />
        <input type="hidden" name="previewVideoUrl" value={previewVideoUrl} />
        <input type="hidden" name="previewVideoMimeType" value={previewVideoMimeType} />
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isPreviewUploading}
            onClick={() => previewFileRef.current?.click()}
          >
            {isPreviewUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {isPreviewUploading ? "업로드 중..." : previewVideoUrl ? "영상 교체" : "영상 업로드"}
          </Button>
          {previewVideoUrl ? (
            <>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={previewVideoUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  미리보기 열기
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending || isPreviewUploading}
                onClick={() => {
                  setPreviewVideoUrl("");
                  setPreviewVideoMimeType("");
                }}
              >
                <X className="size-4" />
                제거
              </Button>
            </>
          ) : (
            <p className="text-sm text-zinc-500">MP4, WebM, MOV 파일을 업로드할 수 있습니다.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending || isPreviewUploading}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          수정 저장
        </Button>
        <Button type="button" variant="outline" disabled={isPending || isPreviewUploading} onClick={() => push(contentsPath)}>
          목록으로
        </Button>
        <Button type="button" variant="secondary" disabled={isPending || isPreviewUploading} onClick={handleTogglePublished}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isMobilePublic ? "모바일 비공개 전환" : "모바일 공개 전환"}
        </Button>
        <Button type="button" variant="destructive" disabled={isPending || isPreviewUploading} onClick={handleDelete}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          삭제
        </Button>
      </div>
    </form>
  );
}
