"use client";

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
} from "@/app/admin/actions";
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
  const [isPending, startTransition] = useTransition();

  const runWithToast = (message: string, action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const loadingId = toast.loading(message);
      const result = await action();

      if (result.ok) {
        toast.success(result.message, { id: loadingId });
      } else {
        toast.error(result.message, { id: loadingId });
      }
    });
  };

  const submitHandler =
    (action: (formData: FormData) => Promise<{ ok: boolean; message: string }>, pendingMessage: string) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      runWithToast(pendingMessage, () => action(formData));
      if (pendingMessage.includes("추가")) {
        event.currentTarget.reset();
      }
    };

  const onDelete = (
    id: string,
    action: (formData: FormData) => Promise<{ ok: boolean; message: string }>,
    pendingMessage: string
  ) => {
    const formData = new FormData();
    formData.set("id", id);
    runWithToast(pendingMessage, () => action(formData));
  };

  return (
    <div className="space-y-5">
      {sections.toSorted(byOrderAsc).map((section) => {
        const details = sectionDetails.filter((detail) => detail.section_id === section.id).toSorted(byOrderAsc);

        return (
          <div key={section.id} className="space-y-3 rounded-lg border p-3">
            <form
              className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]"
              onSubmit={submitHandler(updateTrainingSectionAction, "섹션 수정 중...")}
            >
              <input type="hidden" name="id" value={section.id} />
              <Input name="orderIndex" type="number" defaultValue={section.order_index} min={1} required />
              <Input name="title" defaultValue={section.title} required />
              <Button type="submit" variant="outline" disabled={isPending}>
                수정
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => onDelete(section.id, deleteTrainingSectionAction, "섹션 삭제 중...")}
              >
                섹션 삭제
              </Button>
            </form>

            <div className="space-y-2">
              {details.map((detail) => (
                <form
                  key={detail.id}
                  className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]"
                  onSubmit={submitHandler(updateTrainingSectionDetailAction, "디테일 수정 중...")}
                >
                  <input type="hidden" name="id" value={detail.id} />
                  <Input name="orderIndex" type="number" defaultValue={detail.order_index} min={1} required />
                  <Input name="detail" defaultValue={detail.detail} required />
                  <Button type="submit" variant="outline" disabled={isPending}>
                    수정
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => onDelete(detail.id, deleteTrainingSectionDetailAction, "디테일 삭제 중...")}
                  >
                    삭제
                  </Button>
                </form>
              ))}

              <form
                className="grid gap-2 md:grid-cols-[120px_1fr_auto]"
                onSubmit={submitHandler(createTrainingSectionDetailAction, "디테일 추가 중...")}
              >
                <input type="hidden" name="sectionId" value={section.id} />
                <Input name="orderIndex" type="number" min={1} defaultValue={details.length + 1} required />
                <Input name="detail" placeholder="새 디테일" required />
                <Button type="submit" disabled={isPending}>
                  디테일 추가
                </Button>
              </form>
            </div>
          </div>
        );
      })}

      <form
        className="grid gap-2 md:grid-cols-[120px_1fr_auto]"
        onSubmit={submitHandler(createTrainingSectionAction, "섹션 추가 중...")}
      >
        <input type="hidden" name="programId" value={programId} />
        <Input name="orderIndex" type="number" min={1} defaultValue={sections.length + 1} required />
        <Input name="title" placeholder="새 섹션 제목" required />
        <Button type="submit" disabled={isPending}>
          섹션 추가
        </Button>
      </form>
    </div>
  );
}
