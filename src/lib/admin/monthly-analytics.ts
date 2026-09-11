import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ProgramRow = {
  id: string;
  title: string | null;
  slogan: string | null;
  start_date: string | null;
  end_date: string | null;
  mobile_visibility: string | null;
  display_order: number | null;
};

type ReviewRow = {
  id: string;
  program_id: string;
  status: string;
  coach_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type CoachProfileRow = {
  user_id: string;
  display_name: string | null;
  is_active: boolean;
};

export type MonthlyAnalyticsProgram = {
  id: string;
  title: string;
  period: string;
  isPublic: boolean;
  reviewCount: number;
  answeredCount: number;
  responseRate: number;
  pendingCount: number;
  averageLength: number;
  medianResponseHours: number | null;
  within48Rate: number | null;
};

export type MonthlyAnalyticsCoach = {
  userId: string;
  name: string;
  replyCount: number;
  contributionRate: number;
  averageLength: number;
  medianLength: number;
  medianResponseHours: number | null;
  within24Rate: number | null;
  within48Rate: number | null;
};

export type MonthlyAnalyticsWeek = {
  week: number;
  label: string;
  reviewCount: number;
  answeredCount: number;
  responseRate: number;
};

export type MonthlyAnalyticsReport = {
  month: string;
  monthLabel: string;
  rangeLabel: string;
  generatedAt: string;
  summary: {
    reviewCount: number;
    answeredCount: number;
    responseRate: number;
    pendingCount: number;
    medianResponseHours: number | null;
    averageLength: number;
    within48Rate: number | null;
    activeCoachCount: number;
  };
  backlog: {
    under1Day: number;
    oneTo3Days: number;
    threeTo7Days: number;
    over7Days: number;
    oldestDays: number | null;
  };
  programs: MonthlyAnalyticsProgram[];
  coaches: MonthlyAnalyticsCoach[];
  weeks: MonthlyAnalyticsWeek[];
  insights: string[];
};

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getCurrentSeoulMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

export function normalizeAnalyticsMonth(value: string | undefined) {
  return value && MONTH_PATTERN.test(value) ? value : getCurrentSeoulMonth();
}

function getMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1) - SEOUL_OFFSET_MS);
  const end = new Date(Date.UTC(year, monthNumber, 1) - SEOUL_OFFSET_MS);
  const lastDate = new Date(Date.UTC(year, monthNumber, 0));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${year}년 ${monthNumber}월`,
    rangeLabel: `${year}.${String(monthNumber).padStart(2, "0")}.01 — ${year}.${String(monthNumber).padStart(2, "0")}.${String(lastDate.getUTCDate()).padStart(2, "0")}`,
  };
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function average(values: number[]) {
  return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

  return Math.round(value * 10) / 10;
}

function hasAnswer(review: ReviewRow) {
  return review.status === "reviewed" && Boolean(review.coach_feedback?.trim());
}

function responseHours(review: ReviewRow) {
  if (!hasAnswer(review) || !review.reviewed_at) return null;
  const elapsed = Date.parse(review.reviewed_at) - Date.parse(review.created_at);
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed / 3_600_000 : null;
}

function periodLabel(program: ProgramRow) {
  if (!program.start_date || !program.end_date) return "기간 미설정";
  return `${program.start_date.replaceAll("-", ".")} — ${program.end_date.replaceAll("-", ".")}`;
}

function seoulDayOfMonth(value: string) {
  const shifted = new Date(Date.parse(value) + SEOUL_OFFSET_MS);
  return shifted.getUTCDate();
}

async function getAllMonthlyReviews(
  supabase: SupabaseServerClient,
  tenantId: string,
  start: string,
  end: string,
) {
  const rows: ReviewRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("program_session_reviews")
      .select("id, program_id, status, coach_feedback, reviewed_by, reviewed_at, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
      .returns<ReviewRow[]>();

    if (error) throw new Error(`월별 후기 데이터를 불러오지 못했습니다: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function getMonthlyAnalyticsReport(
  supabase: SupabaseServerClient,
  tenantId: string,
  requestedMonth: string | undefined,
): Promise<MonthlyAnalyticsReport> {
  const month = normalizeAnalyticsMonth(requestedMonth);
  const range = getMonthRange(month);
  const programsPromise = supabase
    .from("programs")
    .select("id, title, slogan, start_date, end_date, mobile_visibility, display_order")
    .eq("tenant_id", tenantId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<ProgramRow[]>();
  const coachProfilesPromise = supabase
    .from("coach_profiles")
    .select("user_id, display_name, is_active")
    .eq("tenant_id", tenantId)
    .returns<CoachProfileRow[]>();
  const reviewsPromise = getAllMonthlyReviews(supabase, tenantId, range.start, range.end);
  const [programsResult, coachProfilesResult, reviews] = await Promise.all([
    programsPromise,
    coachProfilesPromise,
    reviewsPromise,
  ]);

  if (programsResult.error) throw new Error(`프로그램 정보를 불러오지 못했습니다: ${programsResult.error.message}`);
  if (coachProfilesResult.error) throw new Error(`코치 정보를 불러오지 못했습니다: ${coachProfilesResult.error.message}`);

  const programsById = new Map((programsResult.data ?? []).map((program) => [program.id, program]));
  const coachNames = new Map(
    (coachProfilesResult.data ?? []).map((profile) => [
      profile.user_id,
      profile.display_name?.trim() || "이름 미등록 코치",
    ]),
  );
  const answeredReviews = reviews.filter(hasAnswer);
  const now = Date.now();
  const responseTimes = answeredReviews.map(responseHours).filter((value): value is number => value !== null);
  const answerLengths = answeredReviews.map((review) => review.coach_feedback?.trim().length ?? 0);
  const slaEligible = reviews.filter((review) => now - Date.parse(review.created_at) >= 48 * 3_600_000);
  const slaWithin48 = slaEligible.filter((review) => {
    const hours = responseHours(review);
    return hours !== null && hours <= 48;
  }).length;
  const pendingReviews = reviews.filter((review) => !hasAnswer(review));
  const pendingAges = pendingReviews
    .map((review) => (now - Date.parse(review.created_at)) / 86_400_000)
    .filter((age) => Number.isFinite(age) && age >= 0);

  const reviewsByProgram = new Map<string, ReviewRow[]>();
  for (const review of reviews) {
    const items = reviewsByProgram.get(review.program_id) ?? [];
    items.push(review);
    reviewsByProgram.set(review.program_id, items);
  }

  const programs = [...reviewsByProgram.entries()]
    .map(([programId, items]) => {
      const program = programsById.get(programId);
      const answered = items.filter(hasAnswer);
      const times = answered.map(responseHours).filter((value): value is number => value !== null);
      const eligible = items.filter((review) => now - Date.parse(review.created_at) >= 48 * 3_600_000);
      const within48 = eligible.filter((review) => {
        const hours = responseHours(review);
        return hours !== null && hours <= 48;
      }).length;

      return {
        id: programId,
        title: program?.title?.trim() || program?.slogan?.trim() || "프로그램",
        period: program ? periodLabel(program) : "프로그램 정보 없음",
        isPublic: program?.mobile_visibility === "public",
        reviewCount: items.length,
        answeredCount: answered.length,
        responseRate: rate(answered.length, items.length),
        pendingCount: items.length - answered.length,
        averageLength: average(answered.map((review) => review.coach_feedback?.trim().length ?? 0)),
        medianResponseHours: median(times),
        within48Rate: eligible.length > 0 ? rate(within48, eligible.length) : null,
      };
    })
    .sort((a, b) => {
      const aOrder = programsById.get(a.id)?.display_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = programsById.get(b.id)?.display_order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || b.reviewCount - a.reviewCount;
    });

  // Include active coaches even when they have no answers in the selected month.
  // Keep historical responders as well so completed answers remain accounted for.
  const activeCoachIds = new Set(
    (coachProfilesResult.data ?? []).filter((profile) => profile.is_active).map((profile) => profile.user_id),
  );
  const reviewsByCoach = new Map<string, ReviewRow[]>([...activeCoachIds].map((userId) => [userId, []]));
  for (const review of answeredReviews) {
    const coachId = review.reviewed_by ?? "unassigned";
    const items = reviewsByCoach.get(coachId) ?? [];
    items.push(review);
    reviewsByCoach.set(coachId, items);
  }
  const coaches = [...reviewsByCoach.entries()]
    .map(([userId, items]) => {
      const times = items.map(responseHours).filter((value): value is number => value !== null);
      const lengths = items.map((review) => review.coach_feedback?.trim().length ?? 0);

      return {
        userId,
        name: userId === "unassigned" ? "답변자 정보 없음" : coachNames.get(userId) ?? "이름 미등록 코치",
        replyCount: items.length,
        contributionRate: rate(items.length, answeredReviews.length),
        averageLength: average(lengths),
        medianLength: median(lengths) ?? 0,
        medianResponseHours: median(times),
        within24Rate: times.length > 0 ? rate(times.filter((hours) => hours <= 24).length, times.length) : null,
        within48Rate: times.length > 0 ? rate(times.filter((hours) => hours <= 48).length, times.length) : null,
      };
    })
    .sort((a, b) => b.replyCount - a.replyCount || a.name.localeCompare(b.name, "ko"));

  const weeks = Array.from({ length: 5 }, (_, index) => {
    const week = index + 1;
    const items = reviews.filter((review) => Math.floor((seoulDayOfMonth(review.created_at) - 1) / 7) + 1 === week);
    const answered = items.filter(hasAnswer).length;
    const startDay = index * 7 + 1;
    const endDay = Math.min(index * 7 + 7, new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate());

    return {
      week,
      label: `${startDay}–${endDay}일`,
      reviewCount: items.length,
      answeredCount: answered,
      responseRate: rate(answered, items.length),
    };
  }).filter((week) => week.reviewCount > 0);

  const insights: string[] = [];
  const programsWithReviews = programs.filter((program) => program.reviewCount > 0);
  if (programsWithReviews.length > 0) {
    const bestProgram = [...programsWithReviews].sort((a, b) => b.responseRate - a.responseRate)[0];
    const mostPendingProgram = [...programsWithReviews].sort((a, b) => b.pendingCount - a.pendingCount)[0];
    insights.push(`${bestProgram.title}의 답변율이 ${bestProgram.responseRate}%로 가장 높습니다.`);
    if (mostPendingProgram.pendingCount > 0) {
      insights.push(`${mostPendingProgram.title}에 미답변 ${mostPendingProgram.pendingCount}건이 있어 우선 확인이 필요합니다.`);
    }
  }
  const establishedCoaches = coaches.filter((coach) => coach.replyCount >= 5 && coach.medianResponseHours !== null);
  if (establishedCoaches.length > 0) {
    const fastestCoach = [...establishedCoaches].sort(
      (a, b) => (a.medianResponseHours ?? Infinity) - (b.medianResponseHours ?? Infinity),
    )[0];
    const detailedCoach = [...establishedCoaches].sort((a, b) => b.averageLength - a.averageLength)[0];
    insights.push(`${fastestCoach.name} 코치의 중앙 응답 시간이 ${fastestCoach.medianResponseHours}시간으로 가장 빠릅니다.`);
    insights.push(`${detailedCoach.name} 코치의 평균 답변 길이가 ${detailedCoach.averageLength}자로 가장 상세합니다.`);
  }
  if (pendingAges.filter((age) => age >= 7).length > 0) {
    insights.push(`7일 이상 지난 미답변 후기가 ${pendingAges.filter((age) => age >= 7).length}건 있습니다.`);
  }

  return {
    month,
    monthLabel: range.label,
    rangeLabel: range.rangeLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      reviewCount: reviews.length,
      answeredCount: answeredReviews.length,
      responseRate: rate(answeredReviews.length, reviews.length),
      pendingCount: pendingReviews.length,
      medianResponseHours: median(responseTimes),
      averageLength: average(answerLengths),
      within48Rate: slaEligible.length > 0 ? rate(slaWithin48, slaEligible.length) : null,
      activeCoachCount: activeCoachIds.size,
    },
    backlog: {
      under1Day: pendingAges.filter((age) => age < 1).length,
      oneTo3Days: pendingAges.filter((age) => age >= 1 && age < 3).length,
      threeTo7Days: pendingAges.filter((age) => age >= 3 && age < 7).length,
      over7Days: pendingAges.filter((age) => age >= 7).length,
      oldestDays: pendingAges.length > 0 ? Math.round(Math.max(...pendingAges) * 10) / 10 : null,
    },
    programs,
    coaches,
    weeks,
    insights,
  };
}
