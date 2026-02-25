"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateProgramInfoAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProgramInfoEditorData } from "@/lib/admin/types";

function toLineText(values: string[]) {
  return values.join("\n");
}

export function ProgramInfoEditor({ program }: { program: ProgramInfoEditorData }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateProgramInfoAction(formData);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={program.id} />

      <div className="space-y-2">
        <Label htmlFor="teamName">팀 이름</Label>
        <Input id="teamName" name="teamName" defaultValue={program.team_name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slogan">슬로건</Label>
        <Input id="slogan" name="slogan" defaultValue={program.slogan} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" defaultValue={program.description} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coachName">코치 이름</Label>
        <Input id="coachName" name="coachName" defaultValue={program.coach_name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coachInstagram">코치 인스타그램</Label>
        <Input id="coachInstagram" name="coachInstagram" defaultValue={program.coach_instagram} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="coachCareer">코치 경력 (줄바꿈으로 구분)</Label>
        <Textarea id="coachCareer" name="coachCareer" defaultValue={toLineText(program.coach_career)} rows={5} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">시작일</Label>
        <Input id="startDate" name="startDate" type="date" defaultValue={program.start_date} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endDate">종료일</Label>
        <Input id="endDate" name="endDate" type="date" defaultValue={program.end_date} required />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "프로그램 정보 저장"}
        </Button>
      </div>
    </form>
  );
}
