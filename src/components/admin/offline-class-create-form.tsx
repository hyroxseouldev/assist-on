"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createOfflineClassAction } from "@/app/(admin)/admin/actions";
import { uploadOfflineClassContentImage } from "@/components/admin/offline-class-image-upload";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OfflineClassCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contentHtml, setContentHtml] = useState("");

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("contentHtml", contentHtml);

    startTransition(async () => {
      const result = await createOfflineClassAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push("/admin/offline-classes");
        return;
      }

      toast.error(result.message);
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
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push("/admin/offline-classes")}>취소</Button>
      </div>
    </form>
  );
}
