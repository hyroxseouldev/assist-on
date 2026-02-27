"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setActiveProgramAction } from "@/lib/training/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProgramSwitcherProps = {
  tenantSlug: string;
  selectedProgramId?: string;
  programs: Array<{ id: string; title: string }>;
};

export function ProgramSwitcher({ tenantSlug, selectedProgramId, programs }: ProgramSwitcherProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (programs.length <= 1) {
    return null;
  }

  const handleChange = (nextProgramId: string) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug);
    formData.set("programId", nextProgramId);

    startTransition(async () => {
      const result = await setActiveProgramAction(formData);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="mb-1 text-xs text-zinc-500">활성 프로그램</p>
      <div className="flex items-center gap-2">
        <Select value={selectedProgramId ?? programs[0]?.id} onValueChange={handleChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프로그램 선택" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending ? <Loader2 className="size-4 animate-spin text-zinc-500" /> : null}
      </div>
    </div>
  );
}
