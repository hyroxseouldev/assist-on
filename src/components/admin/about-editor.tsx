"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateAboutContentAction } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AboutEditorData } from "@/lib/admin/types";

function toLineText(values: string[]) {
  return values.join("\n");
}

function toTrainingProgramText(trainingProgram: AboutEditorData["training_program"]) {
  return trainingProgram
    .flatMap((section) => [`# ${section.title}`, ...section.details.map((detail) => `- ${detail}`), ""])
    .join("\n")
    .trim();
}

export function AboutEditor({ about }: { about: AboutEditorData }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateAboutContentAction(formData);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={about.id} />

      <div className="space-y-2">
        <Label htmlFor="motivation">Motivation</Label>
        <Input id="motivation" name="motivation" defaultValue={about.motivation} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assistMeaning">Assist 의미</Label>
        <Input id="assistMeaning" name="assistMeaning" defaultValue={about.assist_meaning} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="goal">팀 목표</Label>
        <Textarea id="goal" name="goal" defaultValue={about.goal} required />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="identity">팀 정체성</Label>
        <Textarea id="identity" name="identity" defaultValue={about.identity} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mindsetTitle">마인드셋 타이틀</Label>
        <Input id="mindsetTitle" name="mindsetTitle" defaultValue={about.mindset_title} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mindsetStatement">마인드셋 문구</Label>
        <Input id="mindsetStatement" name="mindsetStatement" defaultValue={about.mindset_statement} required />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="coreMessages">핵심 메시지 (줄바꿈으로 구분)</Label>
        <Textarea id="coreMessages" name="coreMessages" defaultValue={toLineText(about.core_messages)} rows={5} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="philosophyValues">팀 가치 (줄바꿈으로 구분)</Label>
        <Textarea id="philosophyValues" name="philosophyValues" defaultValue={toLineText(about.philosophy_values)} rows={5} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="benefits">지원 항목 (줄바꿈으로 구분)</Label>
        <Textarea id="benefits" name="benefits" defaultValue={toLineText(about.benefits)} rows={5} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="trainingProgramText">프로그램 구성</Label>
        <p className="text-xs text-zinc-500">형식: 섹션은 `# 제목`, 항목은 `- 상세 내용`으로 입력</p>
        <Textarea
          id="trainingProgramText"
          name="trainingProgramText"
          defaultValue={toTrainingProgramText(about.training_program)}
          rows={12}
        />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "About 콘텐츠 저장"}
        </Button>
      </div>
    </form>
  );
}
