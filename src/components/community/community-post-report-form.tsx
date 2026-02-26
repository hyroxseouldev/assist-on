"use client";

import { Flag, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { reportCommunityPostAction } from "@/app/actions/community";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommunityPostReportForm({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await reportCommunityPostAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setReason("");
      setIsOpen(false);
    });
  };

  if (!isOpen) {
    return (
      <Button type="button" variant="ghost" size="sm" className="text-zinc-500" onClick={() => setIsOpen(true)}>
        <Flag className="size-4" />
        신고
      </Button>
    );
  }

  return (
    <form className="w-full space-y-2 rounded-md border border-zinc-200/80 bg-zinc-50 p-3" onSubmit={handleSubmit}>
      <p className="text-xs text-zinc-600">신고 사유를 입력해 주세요. 관리자가 검토합니다.</p>
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        placeholder="예: 욕설/비방, 스팸, 부적절한 홍보"
        required
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          접수
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => setIsOpen(false)}>
          취소
        </Button>
      </div>
    </form>
  );
}
