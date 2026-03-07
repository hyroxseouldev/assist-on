"use client";

import type { FormEvent } from "react";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateMyAccountFullNameAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountProfileNameEditorProps = {
  initialFullName: string;
};

export function AccountProfileNameEditor({ initialFullName }: AccountProfileNameEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "");

    startTransition(async () => {
      const result = await updateMyAccountFullNameAction(fullName);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <form className="space-y-3 rounded-md border bg-zinc-50 p-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="fullName">이름</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={initialFullName}
          placeholder="이름을 입력해 주세요"
          autoComplete="name"
          maxLength={40}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "저장 중..." : "이름 저장"}
      </Button>
    </form>
  );
}
