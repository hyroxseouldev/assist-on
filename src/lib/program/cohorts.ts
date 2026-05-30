import type { ProgramDeliveryMode } from "@/lib/admin/types";
import { addDays } from "@/lib/training/date";

export type CohortProgramRow = {
  id: string;
  delivery_mode: ProgramDeliveryMode;
  content_starts_on: string | null;
  content_ends_on: string | null;
  end_date?: string | null;
};

export type ProgramCohortAccessRow = {
  id: string;
  starts_on: string;
};

export function getKstDayStartIso(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+09:00`).toISOString();
}

export function getKstDayEndIso(dateKey: string) {
  return new Date(`${dateKey}T23:59:59+09:00`).toISOString();
}

export function getDateKeyDayDiff(fromDateKey: string, toDateKey: string) {
  const from = Date.parse(`${fromDateKey}T00:00:00Z`);
  const to = Date.parse(`${toDateKey}T00:00:00Z`);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0;
  }

  return Math.round((to - from) / 86_400_000);
}

export function mapCohortDisplayDateToSessionDate(params: {
  deliveryMode: ProgramDeliveryMode;
  displayDate: string;
  contentStartsOn: string | null;
  cohortStartsOn: string | null;
}) {
  if (params.deliveryMode !== "cohort_based" || !params.contentStartsOn || !params.cohortStartsOn) {
    return params.displayDate;
  }

  return addDays(params.contentStartsOn, getDateKeyDayDiff(params.cohortStartsOn, params.displayDate));
}

export function getCohortEntitlementRange(program: CohortProgramRow, cohort: ProgramCohortAccessRow) {
  if (program.delivery_mode !== "cohort_based") {
    return null;
  }

  if (!program.content_starts_on || !program.content_ends_on) {
    throw new Error("기수제 프로그램의 콘텐츠 기준일을 먼저 설정해 주세요.");
  }

  const durationDays = getDateKeyDayDiff(program.content_starts_on, program.content_ends_on);
  const accessEndsOn = addDays(cohort.starts_on, durationDays);

  return {
    startsAt: getKstDayStartIso(cohort.starts_on),
    endsAt: getKstDayEndIso(accessEndsOn),
  };
}

export function getFixedDateEntitlementRange(program: Pick<CohortProgramRow, "end_date">, startsAt: string) {
  return {
    startsAt,
    endsAt: program.end_date ? getKstDayEndIso(program.end_date) : null,
  };
}
