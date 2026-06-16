"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteYoutubeContentAction,
  toggleYoutubeContentPublishedAction,
  updateYoutubeContentAction,
} from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
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
    formData.set("nextPublished", content.is_published ? "false" : "true");

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
        <Badge variant={content.is_published ? "default" : "secondary"}>
          {content.is_published ? "공개" : "비공개"}
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

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={content.is_published}
          className="size-4 accent-emerald-600"
        />
        공개 상태로 저장
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          수정 저장
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => push(contentsPath)}>
          목록으로
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleTogglePublished}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {content.is_published ? "비공개 전환" : "공개 전환"}
        </Button>
        <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          삭제
        </Button>
      </div>
    </form>
  );
}
