"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveBillingProgramSelection } from "@/lib/billing/actions";
import type { BillingProgram, BillingProgramOverrides } from "@/lib/billing/model";

export function BillingProgramSelector({ tenantSlug, month, programs, detectedIds, excludedIds, overrides, onSaved }: {
  tenantSlug: string;
  month: string;
  programs: BillingProgram[];
  detectedIds: string[];
  excludedIds: string[];
  overrides: BillingProgramOverrides;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(overrides);
  const [pending, startTransition] = useTransition();
  const included = new Set(selection.includedProgramIds);
  const excluded = new Set(selection.excludedProgramIds);
  const automatic = new Set(detectedIds.filter((id) => !excludedIds.includes(id)));
  const isSelected = (id: string) => !excluded.has(id) && (included.has(id) || automatic.has(id));
  const visible = programs.filter((program) => program.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (pending) return;
      if (next) { setSelection(overrides); setQuery(""); }
      setOpen(next);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Settings2 className="size-4" />청구 프로그램 설정</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{month} 청구 프로그램 설정</DialogTitle>
          <DialogDescription>
            체크하면 후기가 없는 프로그램도 이번 달 청구 대상에 포함합니다. 저장 후 예상액을 다시 계산하며, 다음 달은 자동 감지로 시작합니다.
            인원·계약 기간·회원 제외 기준은 그대로 적용합니다.
          </DialogDescription>
        </DialogHeader>
        <Input aria-label="프로그램 검색" placeholder="프로그램 이름 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <p>선택 {programs.filter((program) => isSelected(program.id)).length}개 / 전체 {programs.length}개</p>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setSelection({ includedProgramIds: [], excludedProgramIds: [] })}>자동 감지로 되돌리기</Button>
        </div>
        <div className="max-h-[45vh] space-y-2 overflow-y-auto">
          {visible.map((program) => (
            <label key={program.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3">
              <Checkbox disabled={pending} className="mt-0.5" checked={isSelected(program.id)} onCheckedChange={(checked) => {
                setSelection((current) => ({
                  includedProgramIds: [...current.includedProgramIds.filter((id) => id !== program.id), ...(checked === true ? [program.id] : [])],
                  excludedProgramIds: [...current.excludedProgramIds.filter((id) => id !== program.id), ...(checked === true ? [] : [program.id])],
                }));
              }} />
              <span className="min-w-0 text-sm">
                <span className="block font-medium">{program.title}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {excluded.has(program.id) ? "이번 달 제외" : included.has(program.id) ? "직접 포함" : automatic.has(program.id) ? "자동 감지" : excludedIds.includes(program.id) ? "기본 청구 제외" : "자동 감지되지 않음"}
                </span>
              </span>
            </label>
          ))}
          {!visible.length ? <p className="py-6 text-center text-sm text-zinc-500">검색 결과가 없습니다.</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>취소</Button>
          <Button disabled={pending} onClick={() => startTransition(async () => {
            try {
              const result = await saveBillingProgramSelection(tenantSlug, { month, ...selection });
              if (!result.ok) { toast.error(result.message); return; }
              toast.success(result.message);
              onSaved();
              setOpen(false);
              router.refresh();
            } catch { toast.error("저장하지 못했습니다. 권한과 연결 상태를 확인해 주세요."); }
          })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "저장 중…" : "선택 저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
