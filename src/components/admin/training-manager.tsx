"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  createTrainingSectionAction,
  createTrainingSectionDetailAction,
  deleteTrainingSectionAction,
  deleteTrainingSectionDetailAction,
  updateTrainingSectionAction,
  updateTrainingSectionDetailAction,
} from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SectionDetailRow, SectionRow } from "@/lib/admin/types";

function byOrderAsc<T extends { order_index: number }>(a: T, b: T) {
  return a.order_index - b.order_index;
}

export function TrainingManager({
  programId,
  sections,
  sectionDetails,
}: {
  programId: string;
  sections: SectionRow[];
  sectionDetails: SectionDetailRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const submitHandler =
    (action: (formData: FormData) => Promise<{ ok: boolean; message: string }>, shouldReset = false) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      runWithToast(() => action(formData));
      if (shouldReset) {
        event.currentTarget.reset();
      }
    };

  const onDelete = (
    id: string,
    action: (formData: FormData) => Promise<{ ok: boolean; message: string }>
  ) => {
    const formData = new FormData();
    formData.set("programId", programId);
    formData.set("id", id);
    runWithToast(() => action(formData));
  };

  return (
    <div className="space-y-5">
      {sections.toSorted(byOrderAsc).map((section) => {
        const details = sectionDetails.filter((detail) => detail.section_id === section.id).toSorted(byOrderAsc);

        return (
          <div key={section.id} className="space-y-3 rounded-lg border p-3">
            <form
              className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]"
              onSubmit={submitHandler(updateTrainingSectionAction)}
            >
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="id" value={section.id} />
              <Input name="orderIndex" type="number" defaultValue={section.order_index} min={1} required />
              <Input name="title" defaultValue={section.title} required />
              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                수정
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => onDelete(section.id, deleteTrainingSectionAction)}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                섹션 삭제
              </Button>
            </form>

            <div className="space-y-2">
              {details.map((detail) => (
                <form
                  key={detail.id}
                  className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]"
                  onSubmit={submitHandler(updateTrainingSectionDetailAction)}
                >
                  <input type="hidden" name="programId" value={programId} />
                  <input type="hidden" name="id" value={detail.id} />
                  <Input name="orderIndex" type="number" defaultValue={detail.order_index} min={1} required />
                  <Input name="detail" defaultValue={detail.detail} required />
                  <Button type="submit" variant="outline" disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => onDelete(detail.id, deleteTrainingSectionDetailAction)}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    삭제
                  </Button>
                </form>
              ))}

              <form
                className="grid gap-2 md:grid-cols-[120px_1fr_auto]"
                onSubmit={submitHandler(createTrainingSectionDetailAction, true)}
              >
                <input type="hidden" name="programId" value={programId} />
                <input type="hidden" name="sectionId" value={section.id} />
                <Input name="orderIndex" type="number" min={1} defaultValue={details.length + 1} required />
                <Input name="detail" placeholder="새 디테일" required />
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  디테일 추가
                </Button>
              </form>
            </div>
          </div>
        );
      })}

      <form
        className="grid gap-2 md:grid-cols-[120px_1fr_auto]"
        onSubmit={submitHandler(createTrainingSectionAction, true)}
      >
        <input type="hidden" name="programId" value={programId} />
        <Input name="orderIndex" type="number" min={1} defaultValue={sections.length + 1} required />
        <Input name="title" placeholder="새 섹션 제목" required />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          섹션 추가
        </Button>
      </form>
    </div>
  );
}
