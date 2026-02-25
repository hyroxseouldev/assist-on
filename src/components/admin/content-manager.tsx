"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createProgramContentAction,
  deleteProgramContentAction,
  updateProgramContentAction,
} from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ProgramContentRow, ProgramContentType } from "@/lib/admin/types";

const contentTypes: ProgramContentType[] = ["core_message", "philosophy_value", "benefit"];

const labels: Record<ProgramContentType, string> = {
  core_message: "핵심 메시지",
  philosophy_value: "가치",
  benefit: "혜택",
};

function byOrderAsc<T extends { order_index: number }>(a: T, b: T) {
  return a.order_index - b.order_index;
}

export function ContentManager({
  programId,
  contentItems,
}: {
  programId: string;
  contentItems: ProgramContentRow[];
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

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast(() => updateProgramContentAction(formData));
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runWithToast(() => createProgramContentAction(formData));
    event.currentTarget.reset();
  };

  const handleDelete = (id: string) => {
    const formData = new FormData();
    formData.set("programId", programId);
    formData.set("id", id);
    runWithToast(() => deleteProgramContentAction(formData));
  };

  return (
    <div className="space-y-5">
      {contentTypes.map((type) => {
        const rows = contentItems.filter((item) => item.type === type).toSorted(byOrderAsc);

        return (
          <div key={type} className="space-y-3">
            <h3 className="font-semibold">{labels[type]}</h3>

            {rows.map((item) => (
              <form key={item.id} className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto]" onSubmit={handleUpdate}>
                <input type="hidden" name="programId" value={programId} />
                <input type="hidden" name="id" value={item.id} />
                <Input name="orderIndex" type="number" defaultValue={item.order_index} min={1} required />
                <Input name="content" defaultValue={item.content} required />
                <Button type="submit" variant="outline" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  수정
                </Button>
                <Button type="button" variant="destructive" disabled={isPending} onClick={() => handleDelete(item.id)}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  삭제
                </Button>
              </form>
            ))}

            <form className="grid gap-2 md:grid-cols-[120px_1fr_auto]" onSubmit={handleCreate}>
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="type" value={type} />
              <Input name="orderIndex" type="number" min={1} defaultValue={rows.length + 1} required />
              <Input name="content" placeholder="새 항목" required />
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                추가
              </Button>
            </form>

            <Separator />
          </div>
        );
      })}
    </div>
  );
}
