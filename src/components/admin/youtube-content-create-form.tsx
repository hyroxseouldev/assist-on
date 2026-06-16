"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { createYoutubeContentAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
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

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isPublished" value="true" className="size-4 accent-emerald-600" />
        작성 후 바로 공개
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "등록 중..." : "영상 등록"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => push(contentsPath)}>
          취소
        </Button>
      </div>
    </form>
  );
}
