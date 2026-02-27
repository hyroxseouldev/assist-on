"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteNoticeAction,
  toggleNoticePublishedAction,
  updateNoticeAction,
} from "@/app/(admin)/admin/actions";
import { uploadNoticeContentImage } from "@/components/admin/notice-image-upload";
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
  const [contentHtml, setContentHtml] = useState(notice.content_html);

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", notice.id);
    formData.set("contentHtml", contentHtml);

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
    </form>
  );
}
