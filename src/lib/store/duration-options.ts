export const DURATION_PASS_MONTHS = [1, 2, 3, 6] as const;

export type DurationPassMonths = (typeof DURATION_PASS_MONTHS)[number];

export type DurationPassOption = {
  duration_months: DurationPassMonths;
  price_krw: number;
  is_enabled: boolean;
};

export function isDurationPassMonths(value: unknown): value is DurationPassMonths {
  return typeof value === "number" && DURATION_PASS_MONTHS.includes(value as DurationPassMonths);
}

export function parseDurationPassMonths(value: unknown): DurationPassMonths | null {
  const parsed = typeof value === "string" && value.trim().length > 0 ? Number(value) : value;
  return isDurationPassMonths(parsed) ? parsed : null;
}

export function formatDurationPassLabel(months: DurationPassMonths) {
  return `${months}개월 이용권`;
}

export function formatDurationPassPriceLabel(months: DurationPassMonths, priceKrw: number) {
  return `${formatDurationPassLabel(months)} ${new Intl.NumberFormat("ko-KR").format(priceKrw)}원`;
}

export function getDurationPassOrderName(title: string, months: DurationPassMonths) {
  return `${title} ${formatDurationPassLabel(months)}`;
}

export function getDurationPassStartAt(approvedAt: string, currentEndsAt: string | null) {
  const approvedAtMs = Date.parse(approvedAt);
  const currentEndsAtMs = currentEndsAt ? Date.parse(currentEndsAt) : Number.NaN;

  if (!Number.isNaN(currentEndsAtMs) && currentEndsAtMs >= approvedAtMs) {
    return new Date(currentEndsAtMs + 1).toISOString();
  }

  return approvedAt;
}

export function getDurationPassEndAt(startIso: string, months: DurationPassMonths) {
  const end = new Date(startIso);
  end.setMonth(end.getMonth() + months);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return end.toISOString();
}
