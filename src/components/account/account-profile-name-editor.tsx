"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateMyAccountFullNameAction, updateMyAccountGenderAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProfileGender } from "@/lib/profile/gender";

type AccountProfileNameEditorProps = {
  initialFullName: string;
  initialGender: ProfileGender | null;
};

export function AccountProfileNameEditor({ initialFullName, initialGender }: AccountProfileNameEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gender, setGender] = useState<ProfileGender | "unset">(initialGender ?? "unset");

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

  const handleGenderSave = () => {
    startTransition(async () => {
      const result = await updateMyAccountGenderAction(gender === "unset" ? null : gender);
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

      <div className="space-y-2 border-t border-zinc-200 pt-3">
        <Label htmlFor="gender">성별</Label>
        <div className="flex items-center gap-2">
          <Select value={gender} onValueChange={(value) => setGender(value as ProfileGender | "unset")}>
            <SelectTrigger id="gender" className="max-w-xs">
              <SelectValue placeholder="성별 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">선택 안 함</SelectItem>
              <SelectItem value="male">남성</SelectItem>
              <SelectItem value="female">여성</SelectItem>
              <SelectItem value="other">기타</SelectItem>
              <SelectItem value="prefer_not_to_say">응답 안 함</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleGenderSave}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "저장 중..." : "성별 저장"}
          </Button>
        </div>
      </div>
    </form>
  );
}
