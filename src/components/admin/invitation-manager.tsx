"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { inviteUserAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InvitationManager() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await inviteUserAction(formData);

      if (result.ok) {
        toast.success(result.message);
        form.reset();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" placeholder="invitee@example.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">이름 (선택)</Label>
        <Input id="fullName" name="fullName" placeholder="홍길동" />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "발송 중..." : "초대 메일 발송"}
      </Button>
    </form>
  );
}
