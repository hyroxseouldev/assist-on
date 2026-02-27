"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createTenantProgramAction, deleteTenantProgramAction, updateTenantProgramAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProgramListRow } from "@/lib/admin/types";

type ProgramEditorFormProps = {
  tenantSlug: string;
  program?: AdminProgramListRow;
};

export function ProgramEditorForm({ tenantSlug, program }: ProgramEditorFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    startTransition(async () => {
      const result = program ? await updateTenantProgramAction(formData) : await createTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        if (!program) {
          if (result.programId) {
            router.push(`/t/${tenantSlug}/admin/program/${result.programId}`);
          } else {
            router.refresh();
            formElement.reset();
          }
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    if (!program) {
      return;
    }

    const confirmed = window.confirm("이 프로그램을 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("id", program.id);

    startTransition(async () => {
      const result = await deleteTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(`/t/${tenantSlug}/admin/program`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      {program ? <input type="hidden" name="id" value={program.id} /> : null}

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">프로그램명</Label>
        <Input id="title" name="title" defaultValue={program?.title ?? ""} required />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" defaultValue={program?.description ?? ""} rows={5} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">시작일</Label>
        <Input id="startDate" name="startDate" type="date" defaultValue={program?.start_date ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">종료일</Label>
        <Input id="endDate" name="endDate" type="date" defaultValue={program?.end_date ?? ""} required />
      </div>

      <div className="md:col-span-2 flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : program ? "프로그램 저장" : "프로그램 생성"}
        </Button>

        {program ? (
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            프로그램 삭제
          </Button>
        ) : null}
      </div>
    </form>
  );
}
