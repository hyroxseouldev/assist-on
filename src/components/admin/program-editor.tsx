"use client";

import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateProgramAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProgramRow } from "@/lib/admin/types";

export function ProgramEditor({ program }: { program: ProgramRow }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const loadingId = toast.loading("프로그램 저장 중...");
      const result = await updateProgramAction(formData);

      if (result.ok) {
        toast.success(result.message, { id: loadingId });
      } else {
        toast.error(result.message, { id: loadingId });
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
      <div className="space-y-2">
        <Label htmlFor="motivation">Motivation</Label>
        <Input id="motivation" name="motivation" defaultValue={program.motivation} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assistMeaning">Assist 의미</Label>
        <Input id="assistMeaning" name="assistMeaning" defaultValue={program.assist_meaning} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="goal">목표</Label>
        <Textarea id="goal" name="goal" defaultValue={program.goal} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="identity">정체성</Label>
        <Textarea id="identity" name="identity" defaultValue={program.identity} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mindsetTitle">마인드셋 타이틀</Label>
        <Input id="mindsetTitle" name="mindsetTitle" defaultValue={program.mindset_title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mindsetStatement">마인드셋 문구</Label>
        <Input id="mindsetStatement" name="mindsetStatement" defaultValue={program.mindset_statement} required />
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
          {isPending ? "저장 중..." : "기본 정보 저장"}
        </Button>
      </div>
    </form>
  );
}
