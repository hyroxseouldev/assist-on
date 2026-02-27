"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createNoticeAction } from "@/lib/admin/actions";
import { uploadNoticeContentImage } from "@/components/admin/notice-image-upload";
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
  const [contentHtml, setContentHtml] = useState("");

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("contentHtml", contentHtml);

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
    </form>
  );
}
