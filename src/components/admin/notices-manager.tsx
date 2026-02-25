"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createNoticeAction,
  deleteNoticeAction,
  toggleNoticePublishedAction,
  updateNoticeAction,
} from "@/app/(admin)/admin/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { NoticeRow } from "@/lib/admin/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type NoticesManagerProps = {
  notices: NoticeRow[];
};

export function NoticesManager({ notices }: NoticesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draftContent, setDraftContent] = useState("");
  const [contentById, setContentById] = useState<Record<string, string>>(
    Object.fromEntries(notices.map((notice) => [notice.id, notice.content_html]))
  );

  const runWithToast = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("contentHtml", draftContent);

    runWithToast(async () => {
      const result = await createNoticeAction(formData);
      if (result.ok) {
        form.reset();
        setDraftContent("");
      }
      return result;
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", id);
    formData.set("contentHtml", contentById[id] ?? "");
    runWithToast(() => updateNoticeAction(formData));
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.set("id", id);
    runWithToast(() => deleteNoticeAction(formData));
  };

  const handleTogglePublished = (id: string, nextPublished: boolean) => {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("nextPublished", nextPublished ? "true" : "false");
    runWithToast(() => toggleNoticePublishedAction(formData));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">공지 추가</h3>
        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="space-y-2">
            <Label htmlFor="newTitle">제목</Label>
            <Input id="newTitle" name="title" placeholder="예: 3월 팀 세션 일정 변경" required />
          </div>

          <div className="space-y-2">
            <Label>본문</Label>
            <TiptapEditor value={draftContent} onChange={setDraftContent} placeholder="공지 본문을 입력하세요." />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="isPublished" value="true" defaultChecked className="size-4 accent-emerald-600" />
            작성 후 바로 공개
          </label>

          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "등록 중..." : "공지 등록"}
          </Button>
        </form>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">공지 목록</h3>

        {notices.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 공지가 없습니다.</p>
        ) : (
          <div className="space-y-5">
            {notices.map((notice) => (
              <form key={notice.id} className="space-y-3 rounded-lg border border-zinc-200 p-4" onSubmit={(event) => handleUpdate(event, notice.id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={notice.is_published ? "default" : "secondary"}>
                    {notice.is_published ? "공개" : "비공개"}
                  </Badge>
                  <p className="text-xs text-zinc-500">생성: {formatDateTime(notice.created_at)}</p>
                  <p className="text-xs text-zinc-500">수정: {formatDateTime(notice.updated_at)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`title-${notice.id}`}>제목</Label>
                  <Input id={`title-${notice.id}`} name="title" defaultValue={notice.title} required />
                </div>

                <div className="space-y-2">
                  <Label>본문</Label>
                  <TiptapEditor
                    value={contentById[notice.id] ?? ""}
                    onChange={(value) => setContentById((prev) => ({ ...prev, [notice.id]: value }))}
                    placeholder="공지 본문을 입력하세요."
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
                  <Button type="submit" variant="outline" disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    수정 저장
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleTogglePublished(notice.id, !notice.is_published)}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {notice.is_published ? "비공개 전환" : "공개 전환"}
                  </Button>
                  <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleDelete(notice.id)}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    삭제
                  </Button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
