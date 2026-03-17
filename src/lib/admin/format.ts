const SEOUL_TIME_ZONE = "Asia/Seoul";

const adminDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const adminDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const adminMonthDayTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: SEOUL_TIME_ZONE,
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatAdminValue(value: string | null | undefined, formatter: Intl.DateTimeFormat) {
  if (!value) {
    return "-";
  }

  return formatter.format(new Date(value));
}

export function formatAdminDate(value: string | null | undefined) {
  return formatAdminValue(value, adminDateFormatter);
}

export function formatAdminDateTime(value: string | null | undefined) {
  return formatAdminValue(value, adminDateTimeFormatter);
}

export function formatAdminMonthDayTime(value: string | null | undefined) {
  return formatAdminValue(value, adminMonthDayTimeFormatter);
}
