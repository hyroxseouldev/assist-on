"use client";

import { ArrowRight, History, Loader2, Repeat2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { changeMemberProgramEntitlementAction } from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { ManagedUserProgramEntitlement, ManagedUserRow } from "@/lib/admin/types";

export type UserGrantProgramOption = {
  id: string;
  label: string;
  deliveryMode: "fixed_date" | "cohort_based";
  cohorts: Array<{ id: string; name: string; starts_on: string; is_default: boolean }>;
};

function getProgramEntitlementStatus(entitlement: ManagedUserProgramEntitlement, nowTimestamp: number) {
  if (!entitlement.is_active) {
    return { label: "비활성", variant: "outline" as const };
  }

  if (Date.parse(entitlement.starts_at) > nowTimestamp) {
    return { label: "대기", variant: "secondary" as const };
  }

  if (!entitlement.ends_at) {
    return { label: "활성", variant: "default" as const };
  }

  return Date.parse(entitlement.ends_at) >= nowTimestamp
    ? { label: "활성", variant: "default" as const }
    : { label: "만료", variant: "secondary" as const };
}

type ProgramChangeSectionProps = {
  selectedUser: ManagedUserRow;
  programs: UserGrantProgramOption[];
  nowTimestamp: number;
};

function getProgramChangeTargets(
  programs: UserGrantProgramOption[],
  activeEntitlements: ManagedUserProgramEntitlement[],
  sourceEntitlement: ManagedUserProgramEntitlement | null
) {
  const sourceTitle = sourceEntitlement?.program_title ?? "";

  return programs
    .filter(
      (program) =>
        program.id !== sourceEntitlement?.program_id &&
        !activeEntitlements.some((entitlement) => entitlement.program_id === program.id)
    )
    .map((program) => {
      let sharedPrefixLength = 0;
      while (
        sharedPrefixLength < sourceTitle.length &&
        sharedPrefixLength < program.label.length &&
        sourceTitle[sharedPrefixLength] === program.label[sharedPrefixLength]
      ) {
        sharedPrefixLength += 1;
      }

      return { program, sharedPrefixLength };
    })
    .sort((a, b) => b.sharedPrefixLength - a.sharedPrefixLength)
    .map(({ program }) => program);
}

export function ProgramChangeSection({ selectedUser, programs, nowTimestamp }: ProgramChangeSectionProps) {
  const router = useRouter();
  const tenantSlug = useTenantSlug();
  const [isPending, startTransition] = useTransition();
  const activeEntitlements = (selectedUser.program_entitlements ?? []).filter(
    (entitlement) => getProgramEntitlementStatus(entitlement, nowTimestamp).label === "활성"
  );
  const initialSource =
    activeEntitlements.find((entitlement) => entitlement.program_id === selectedUser.active_program_id) ??
    activeEntitlements[0] ??
    null;
  const initialTargetPrograms = getProgramChangeTargets(programs, activeEntitlements, initialSource);
  const initialTarget = initialTargetPrograms[0] ?? null;
  const initialTargetCohort =
    initialTarget?.cohorts.find((cohort) => cohort.is_default) ?? initialTarget?.cohorts[0] ?? null;
  const [fromEntitlementId, setFromEntitlementId] = useState(initialSource?.id ?? "");
  const [toProgramId, setToProgramId] = useState(initialTarget?.id ?? "");
  const [toCohortId, setToCohortId] = useState(initialTargetCohort?.id ?? "");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const sourceEntitlement =
    activeEntitlements.find((entitlement) => entitlement.id === fromEntitlementId) ?? null;
  const targetPrograms = getProgramChangeTargets(programs, activeEntitlements, sourceEntitlement);
  const targetProgram = targetPrograms.find((program) => program.id === toProgramId) ?? null;
  const requiresCohort = targetProgram?.deliveryMode === "cohort_based";
  const canSubmit = Boolean(sourceEntitlement && targetProgram && (!requiresCohort || toCohortId));

  const handleSourceChange = (nextEntitlementId: string) => {
    const nextSource = activeEntitlements.find((entitlement) => entitlement.id === nextEntitlementId) ?? null;
    const nextTargets = getProgramChangeTargets(programs, activeEntitlements, nextSource);
    const nextTarget = nextTargets[0] ?? null;
    const nextCohort = nextTarget?.cohorts.find((cohort) => cohort.is_default) ?? nextTarget?.cohorts[0] ?? null;

    setFromEntitlementId(nextEntitlementId);
    setToProgramId(nextTarget?.id ?? "");
    setToCohortId(nextCohort?.id ?? "");
  };

  const handleTargetChange = (nextProgramId: string) => {
    const nextTarget = targetPrograms.find((program) => program.id === nextProgramId) ?? null;
    const nextCohort = nextTarget?.cohorts.find((cohort) => cohort.is_default) ?? nextTarget?.cohorts[0] ?? null;

    setToProgramId(nextProgramId);
    setToCohortId(nextCohort?.id ?? "");
  };

  const handleApply = () => {
    if (!sourceEntitlement || !targetProgram || (requiresCohort && !toCohortId)) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("userId", selectedUser.id);
    formData.set("fromEntitlementId", sourceEntitlement.id);
    formData.set("toProgramId", targetProgram.id);
    formData.set("toCohortId", toCohortId);

    startTransition(async () => {
      const result = await changeMemberProgramEntitlementAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setIsConfirmOpen(false);
      router.refresh();
    });
  };

  const history = selectedUser.program_change_history ?? [];

  return (
    <>
      <div className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
        <div className="flex items-start gap-2">
          <Repeat2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="font-medium text-zinc-900">참여 프로그램 변경</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              활성 프로그램을 즉시 변경합니다. 기존 운동 기록과 피드백, 이용 종료일은 그대로 유지됩니다.
            </p>
          </div>
        </div>

        {activeEntitlements.length === 0 ? (
          <p className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm text-zinc-600">
            변경할 수 있는 활성 프로그램이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="program-change-source">현재 프로그램</Label>
              <select
                id="program-change-source"
                value={fromEntitlementId}
                onChange={(event) => handleSourceChange(event.target.value)}
                disabled={isPending}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                {activeEntitlements.map((entitlement) => (
                  <option key={entitlement.id} value={entitlement.id}>
                    {entitlement.program_title}
                    {entitlement.cohort_name ? ` · ${entitlement.cohort_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="program-change-target">변경할 프로그램</Label>
              <select
                id="program-change-target"
                value={toProgramId}
                onChange={(event) => handleTargetChange(event.target.value)}
                disabled={isPending || targetPrograms.length === 0}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                {targetPrograms.length === 0 ? <option value="">변경 가능한 프로그램 없음</option> : null}
                {targetPrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.label}
                  </option>
                ))}
              </select>
            </div>

            {requiresCohort ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="program-change-cohort">변경할 기수</Label>
                <select
                  id="program-change-cohort"
                  value={toCohortId}
                  onChange={(event) => setToCohortId(event.target.value)}
                  disabled={isPending || !targetProgram?.cohorts.length}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                >
                  {!targetProgram?.cohorts.length ? <option value="">선택 가능한 기수 없음</option> : null}
                  {targetProgram?.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        )}

        {sourceEntitlement && targetProgram ? (
          <div className="rounded-md border border-emerald-200 bg-white px-3 py-3">
            <div className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
              <span>{sourceEntitlement.program_title}</span>
              <ArrowRight className="size-4 text-emerald-700" aria-hidden="true" />
              <span>{targetProgram.label}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              적용 시점: 즉시 · 종료일: {sourceEntitlement.ends_at ? formatAdminDateTime(sourceEntitlement.ends_at) : "제한 없음"}
            </p>
          </div>
        ) : null}

        <Button type="button" onClick={() => setIsConfirmOpen(true)} disabled={isPending || !canSubmit}>
          변경 내용 확인
        </Button>
      </div>

      <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-zinc-500" aria-hidden="true" />
          <p className="font-medium text-zinc-900">프로그램 변경 이력</p>
        </div>
        {history.length === 0 ? (
          <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
            아직 변경 이력이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-md border border-zinc-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                  <span>{item.from_program_title}</span>
                  <ArrowRight className="size-3.5 text-zinc-400" aria-hidden="true" />
                  <span>{item.to_program_title}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatAdminDateTime(item.created_at)} · {item.changed_by_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser.full_name}님의 프로그램 변경</DialogTitle>
            <DialogDescription>아래 내용을 확인한 뒤 변경을 적용해 주세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-zinc-900">
              <span>{sourceEntitlement?.program_title}</span>
              <ArrowRight className="size-4 text-emerald-700" aria-hidden="true" />
              <span>{targetProgram?.label}</span>
            </div>
            <div className="space-y-1.5 text-zinc-600">
              <p>적용 시점: 즉시</p>
              <p>기존 운동 기록과 피드백은 유지됩니다.</p>
              <p>
                이용 종료일은 {sourceEntitlement?.ends_at ? formatAdminDateTime(sourceEntitlement.ends_at) : "제한 없음"}으로 유지됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="button" onClick={handleApply} disabled={isPending || !canSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "변경 중..." : "변경 적용"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

