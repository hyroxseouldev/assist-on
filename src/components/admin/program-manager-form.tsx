"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveProgramManagers } from "@/lib/admin/program-manager-actions";

export function ProgramManagerForm({ tenantSlug, programId, managers, assignedIds }: {
  tenantSlug: string;
  programId: string;
  managers: { id: string; name: string }[];
  assignedIds: string[];
}) {
  const [selected, setSelected] = useState(assignedIds);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <form className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4" onSubmit={(event) => {
      event.preventDefault();
      startTransition(async () => {
        const result = await saveProgramManagers(tenantSlug, { programId, managerIds: selected });
        if (!result.ok) { toast.error(result.message); return; }
        toast.success(result.message);
        router.refresh();
      });
    }}>
      <div>
        <h2 className="text-base font-semibold">담당 매니저</h2>
        <p className="mt-1 text-sm text-zinc-500">배정된 프로그램의 사전등록과 참여 프로그램 변경을 관리합니다. 앱의 코치 소개에는 표시되지 않습니다.</p>
      </div>
      {managers.length === 0 ? <p className="text-sm text-zinc-500">등록된 매니저 계정이 없습니다.</p> : (
        <fieldset disabled={isPending} className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">담당 매니저 선택</legend>
          {managers.map((manager) => <label key={manager.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
            <input type="checkbox" className="size-4 accent-emerald-700" checked={selected.includes(manager.id)} onChange={(event) => {
              setSelected((current) => event.target.checked ? [...current, manager.id] : current.filter((id) => id !== manager.id));
            }} />
            {manager.name}
          </label>)}
        </fieldset>
      )}
      <Button type="submit" disabled={isPending || (managers.length === 0 && assignedIds.length === 0)}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {isPending ? "저장 중…" : "담당 매니저 저장"}
      </Button>
    </form>
  );
}
