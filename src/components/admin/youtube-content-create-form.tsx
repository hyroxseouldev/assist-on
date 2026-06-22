"use client";

import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createYoutubeContentAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { uploadYoutubePreviewVideo } from "@/components/admin/youtube-preview-video-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";

export function YoutubeContentCreateForm({ tenantSlug }: { tenantSlug: string }) {
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const contentsPath = `${tenantBasePath}/admin/youtube`;
  const [isPending, startTransition] = useTransition();
  const [isPreviewUploading, setIsPreviewUploading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [previewVideoMimeType, setPreviewVideoMimeType] = useState("");
  const previewFileRef = useRef<HTMLInputElement>(null);

  const handlePreviewFileChange = async (file: File | undefined) => {
    if (!file) return;

    setIsPreviewUploading(true);
    try {
      const uploaded = await uploadYoutubePreviewVideo(file);
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

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);

    startTransition(async () => {
      const result = await createYoutubeContentAction(formData);
      if (result.ok) {
        toast.success(result.message);
        push(contentsPath);
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleCreate}>
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input id="title" name="title" placeholder="예: 러닝 드릴 가이드" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtubeUrl">유튜브 URL</Label>
        <Input id="youtubeUrl" name="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" placeholder="앱 목록에 표시할 짧은 설명을 입력하세요." rows={4} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="thumbnailUrl">썸네일 URL</Label>
          <Input id="thumbnailUrl" name="thumbnailUrl" placeholder="비워두면 유튜브 기본 썸네일 사용" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayOrder">정렬값</Label>
          <Input id="displayOrder" name="displayOrder" type="number" inputMode="numeric" defaultValue={0} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mobileVisibility">모바일 공개</Label>
          <select
            id="mobileVisibility"
            name="mobileVisibility"
            defaultValue="public"
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="public">공개 (저장 즉시 앱에 공개)</option>
            <option value="private">비공개</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genre">장르</Label>
          <Input id="genre" name="genre" placeholder="예: 러닝, HYROX, 스트렝스" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">태그</Label>
        <Input id="tags" name="tags" placeholder="쉼표로 구분해 입력하세요. 예: 드릴, 초급, 인터벌" />
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
            {isPreviewUploading ? "업로드 중..." : "영상 업로드"}
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

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending || isPreviewUploading}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "등록 중..." : "영상 등록"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending || isPreviewUploading} onClick={() => push(contentsPath)}>
          취소
        </Button>
      </div>
    </form>
  );
}
