import { redirect } from "next/navigation";

import { aboutToEditorData, programToEditorData, type AboutContentRow } from "@/lib/about/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canManageTenantContent,
  getTenantBySlug,
  getUserTenantRole,
  isPlatformAdmin,
} from "@/lib/tenant/server";
import type {
  AdminLegalDocumentRow,
  AdminProgramListRow,
  AdminProgramOrderRow,
  AdminProgramProductRow,
  AdminCommunityPostRow,
  AdminCommunityPostsPage,
  AdminCommunityReportRow,
  AdminCommunityReportsPage,
  CommunityPostStatus,
  CommunityReportStatus,
  ManagedUsersPage,
  ManagedUserSortBy,
  ManagedUserRow,
  NoticeRow,
  OfflineClassRegistrationRow,
  OfflineClassRow,
  OfflineClassWithParticipants,
  ProgramRow,
  SessionRow,
  LegalDocumentType,
  LegalDocumentLocale,
  TenantBrandingEditorData,
  TenantMembershipRole,
} from "@/lib/admin/types";

type ProgramPickerRow = {
  id: string;
  title: string;
  slogan: string;
  start_date: string;
  end_date: string;
};

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tenant/login");
  }

  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    redirect("/t/select");
  }

  const [platformAdmin, tenantRole] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    getUserTenantRole(supabase, user.id, tenant.id),
  ]);

  const isAdmin = platformAdmin || canManageTenantContent(tenantRole);

  return {
    supabase,
    user,
    isAdmin,
    isPlatformAdmin: platformAdmin,
    tenant,
    tenantRole,
  };
}

export async function getPrimarySessionProgramId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("programs")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function getTenantSessionPrograms(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as Array<{ id: string; label: string }>;
  }

  const { data } = await supabase
    .from("programs")
    .select("id, title, slogan, start_date, end_date")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .returns<ProgramPickerRow[]>();

  return (data ?? []).map((program, index) => {
    const title = program.title?.trim() || program.slogan?.trim() || `프로그램 ${index + 1}`;
    return {
      id: program.id,
      label: `${title} (${program.start_date} ~ ${program.end_date})`,
    };
  });
}

export async function getAboutEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data: about } = await supabase
    .from("about_content")
    .select(
      "id, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, core_messages, philosophy_values, benefits, training_program"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<AboutContentRow>();

  if (!about) {
    return null;
  }

  return aboutToEditorData(about);
}

export async function getProgramInfoEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, team_name, thumbnail_url, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  if (!program) {
    return null;
  }

  return programToEditorData(program);
}

export async function getTenantBrandingEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("tenant_branding")
    .select("tenant_id, team_name, logo_url, coach_image_url, slogan, description, coach_name, coach_instagram, coach_career")
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingEditorData>();

  return data ?? null;
}

export async function getAdminPrograms(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminProgramListRow[];
  }

  const { data } = await supabase
    .from("programs")
    .select(
      "id, title, description, thumbnail_url, difficulty, daily_workout_minutes, days_per_week, start_date, end_date, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .returns<AdminProgramListRow[]>();

  return data ?? [];
}

export async function getAdminProgramById(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("programs")
    .select(
      "id, title, description, thumbnail_url, difficulty, daily_workout_minutes, days_per_week, start_date, end_date, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<AdminProgramListRow>();

  return data ?? null;
}

export async function getAdminProgramProducts(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminProgramProductRow[];
  }

  const { data } = await supabase
    .from("program_products")
    .select(
      "id, tenant_id, program_id, price_krw, is_active, sale_type, billing_interval, billing_anchor_day, subscription_grace_days, thumbnail_urls, content_html, program:program_id(title)"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        program_id: string;
        price_krw: number;
        is_active: boolean;
        sale_type: "one_time" | "subscription" | null;
        billing_interval: "monthly" | null;
        billing_anchor_day: number | null;
        subscription_grace_days: number | null;
        thumbnail_urls: unknown;
        content_html: string | null;
        program: { title: string } | null;
      }>
    >();

  return (data ?? []).map((row) => {
    const saleType: AdminProgramProductRow["sale_type"] = row.sale_type === "subscription" ? "subscription" : "one_time";

    return {
    id: row.id,
    tenant_id: row.tenant_id,
    program_id: row.program_id,
    price_krw: row.price_krw,
    is_active: row.is_active,
    sale_type: saleType,
    billing_interval: saleType === "subscription" ? (row.billing_interval ?? "monthly") : null,
    billing_anchor_day: row.billing_anchor_day,
    subscription_grace_days: row.subscription_grace_days ?? 3,
    program_title: row.program?.title ?? "제목 없음",
    thumbnail_urls: Array.isArray(row.thumbnail_urls)
      ? row.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [],
    content_html: row.content_html ?? "",
    } satisfies AdminProgramProductRow;
  });
}

export async function getAdminProgramProductById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string
) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("program_products")
    .select(
      "id, tenant_id, program_id, price_krw, is_active, sale_type, billing_interval, billing_anchor_day, subscription_grace_days, thumbnail_urls, content_html, program:program_id(title)"
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      program_id: string;
      price_krw: number;
      is_active: boolean;
      sale_type: "one_time" | "subscription" | null;
      billing_interval: "monthly" | null;
      billing_anchor_day: number | null;
      subscription_grace_days: number | null;
      thumbnail_urls: unknown;
      content_html: string | null;
      program: { title: string } | null;
    }>();

  if (!data) {
    return null;
  }

  const saleType: AdminProgramProductRow["sale_type"] = data.sale_type === "subscription" ? "subscription" : "one_time";

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    program_id: data.program_id,
    price_krw: data.price_krw,
    is_active: data.is_active,
    sale_type: saleType,
    billing_interval: saleType === "subscription" ? (data.billing_interval ?? "monthly") : null,
    billing_anchor_day: data.billing_anchor_day,
    subscription_grace_days: data.subscription_grace_days ?? 3,
    program_title: data.program?.title ?? "제목 없음",
    thumbnail_urls: Array.isArray(data.thumbnail_urls)
      ? data.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [],
    content_html: data.content_html ?? "",
  } satisfies AdminProgramProductRow;
}

export async function getAdminProgramOrders(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminProgramOrderRow[];
  }

  const { data: orders } = await supabase
    .from("program_orders")
    .select("id, provider_order_id, buyer_user_id, amount_krw, status, paid_at, created_at, product:product_id(program:program_id(title))")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<
      Array<{
        id: string;
        provider_order_id: string;
        buyer_user_id: string;
        amount_krw: number;
        status: string;
        paid_at: string | null;
        created_at: string;
        product: { program: { title: string } | null } | null;
      }>
    >();

  const buyerIds = [...new Set((orders ?? []).map((row) => row.buyer_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", buyerIds)
    .returns<Array<{ id: string; full_name: string | null }>>();

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name?.trim() || "회원"]));

  return (orders ?? []).map((row) => ({
    id: row.id,
    provider_order_id: row.provider_order_id,
    buyer_user_id: row.buyer_user_id,
    buyer_name: profileMap.get(row.buyer_user_id) ?? "회원",
    product_title: row.product?.program?.title ?? "프로그램",
    amount_krw: row.amount_krw,
    status: row.status,
    paid_at: row.paid_at,
    created_at: row.created_at,
  }));
}

export async function getSessions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, title, content_html")
    .eq("tenant_id", tenant.id)
    .eq("program_id", programId)
    .order("session_date", { ascending: true })
    .returns<SessionRow[]>();

  return data ?? [];
}

function toDisplayName(fullName: string | null) {
  const value = fullName?.trim();
  return value && value.length > 0 ? value : "Member";
}

export async function getAdminCommunityPosts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  status: CommunityPostStatus | "all" = "all"
) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminCommunityPostRow[];
  }

  let query = supabase
    .from("community_posts")
    .select("id, title, author_id, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: posts } = await query.returns<
    Array<{
      id: string;
      title: string;
      author_id: string;
      status: CommunityPostStatus;
      created_at: string;
    }>
  >();

  const postRows = posts ?? [];
  if (postRows.length === 0) {
    return [] as AdminCommunityPostRow[];
  }

  const postIds = postRows.map((post) => post.id);
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];

  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds)
      .returns<Array<{ id: string; full_name: string | null }>>(),
    supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .in("post_id", postIds)
      .returns<Array<{ post_id: string }>>(),
    supabase
      .from("community_comments")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "published")
      .in("post_id", postIds)
      .returns<Array<{ post_id: string }>>(),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, toDisplayName(profile.full_name)]));
  const likeCountMap = (likes ?? []).reduce<Record<string, number>>((acc, like) => {
    acc[like.post_id] = (acc[like.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const commentCountMap = (comments ?? []).reduce<Record<string, number>>((acc, comment) => {
    acc[comment.post_id] = (acc[comment.post_id] ?? 0) + 1;
    return acc;
  }, {});

  return postRows.map((post) => ({
    id: post.id,
    title: post.title,
    author_id: post.author_id,
    author_name: profileMap.get(post.author_id) ?? "Member",
    status: post.status,
    created_at: post.created_at,
    like_count: likeCountMap[post.id] ?? 0,
    comment_count: commentCountMap[post.id] ?? 0,
  }));
}

export async function getAdminCommunityReports(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  status: CommunityReportStatus | "all" = "open"
) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminCommunityReportRow[];
  }

  let query = supabase
    .from("community_post_reports")
    .select("id, post_id, reporter_id, reason, status, reviewed_by, reviewed_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: reports } = await query.returns<
    Array<{
      id: string;
      post_id: string;
      reporter_id: string;
      reason: string;
      status: CommunityReportStatus;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
    }>
  >();

  const reportRows = reports ?? [];
  if (reportRows.length === 0) {
    return [] as AdminCommunityReportRow[];
  }

  const postIds = [...new Set(reportRows.map((report) => report.post_id))];
  const userIds = [...new Set(reportRows.flatMap((report) => [report.reporter_id, report.reviewed_by].filter(Boolean) as string[]))];

  const [{ data: posts }, { data: profiles }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, title")
      .eq("tenant_id", tenant.id)
      .in("id", postIds)
      .returns<Array<{ id: string; title: string }>>(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)
      .returns<Array<{ id: string; full_name: string | null }>>(),
  ]);

  const postMap = new Map((posts ?? []).map((post) => [post.id, post.title]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, toDisplayName(profile.full_name)]));

  return reportRows.map((report) => ({
    id: report.id,
    post_id: report.post_id,
    post_title: postMap.get(report.post_id) ?? "삭제된 게시글",
    reporter_id: report.reporter_id,
    reporter_name: profileMap.get(report.reporter_id) ?? "Member",
    reason: report.reason,
    status: report.status,
    reviewed_by: report.reviewed_by,
    reviewed_by_name: report.reviewed_by ? (profileMap.get(report.reviewed_by) ?? "Member") : null,
    reviewed_at: report.reviewed_at,
    created_at: report.created_at,
  }));
}

type CommunityPageParams<TStatus extends string> = {
  status: TStatus | "all";
  query: string;
  page: number;
  pageSize: number;
};

function normalizePagedParams({ query, page, pageSize }: { query: string; page: number; pageSize: number }) {
  const normalizedQuery = query.trim();
  const normalizedPageSize = [10, 20, 50].includes(pageSize) ? pageSize : 20;
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  return {
    normalizedQuery,
    normalizedPage,
    normalizedPageSize,
  };
}

export async function getAdminCommunityPostsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  { status, query, page, pageSize }: CommunityPageParams<CommunityPostStatus>
): Promise<AdminCommunityPostsPage> {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { normalizedQuery, normalizedPage, normalizedPageSize } = normalizePagedParams({ query, page, pageSize });

  let countQuery = supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);

  if (status !== "all") {
    countQuery = countQuery.eq("status", status);
  }

  if (normalizedQuery) {
    countQuery = countQuery.or(`title.ilike.%${normalizedQuery}%,content_html.ilike.%${normalizedQuery}%`);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  let rowsQuery = supabase
    .from("community_posts")
    .select("id, title, content_html, author_id, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    rowsQuery = rowsQuery.eq("status", status);
  }

  if (normalizedQuery) {
    rowsQuery = rowsQuery.or(`title.ilike.%${normalizedQuery}%,content_html.ilike.%${normalizedQuery}%`);
  }

  const { data: posts } = await rowsQuery.returns<
    Array<{
      id: string;
      title: string;
      content_html: string;
      author_id: string;
      status: CommunityPostStatus;
      created_at: string;
    }>
  >();

  const postRows = posts ?? [];
  const postIds = postRows.map((post) => post.id);
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];

  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    authorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds)
          .returns<Array<{ id: string; full_name: string | null }>>()
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    postIds.length > 0
      ? supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    postIds.length > 0
      ? supabase
          .from("community_comments")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .eq("status", "published")
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, toDisplayName(profile.full_name)]));
  const likeCountMap = (likes ?? []).reduce<Record<string, number>>((acc, like) => {
    acc[like.post_id] = (acc[like.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const commentCountMap = (comments ?? []).reduce<Record<string, number>>((acc, comment) => {
    acc[comment.post_id] = (acc[comment.post_id] ?? 0) + 1;
    return acc;
  }, {});

  return {
    items: postRows.map((post) => ({
      id: post.id,
      title: post.title,
      content_html: post.content_html,
      author_id: post.author_id,
      author_name: profileMap.get(post.author_id) ?? "Member",
      status: post.status,
      created_at: post.created_at,
      like_count: likeCountMap[post.id] ?? 0,
      comment_count: commentCountMap[post.id] ?? 0,
    })),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminCommunityReportsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  { status, query, page, pageSize }: CommunityPageParams<CommunityReportStatus>
): Promise<AdminCommunityReportsPage> {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { normalizedQuery, normalizedPage, normalizedPageSize } = normalizePagedParams({ query, page, pageSize });

  let countQuery = supabase
    .from("community_post_reports")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  if (status !== "all") {
    countQuery = countQuery.eq("status", status);
  }

  if (normalizedQuery) {
    countQuery = countQuery.ilike("reason", `%${normalizedQuery}%`);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  let reportsQuery = supabase
    .from("community_post_reports")
    .select("id, post_id, reporter_id, reason, status, reviewed_by, reviewed_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    reportsQuery = reportsQuery.eq("status", status);
  }

  if (normalizedQuery) {
    reportsQuery = reportsQuery.ilike("reason", `%${normalizedQuery}%`);
  }

  const { data: reports } = await reportsQuery.returns<
    Array<{
      id: string;
      post_id: string;
      reporter_id: string;
      reason: string;
      status: CommunityReportStatus;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
    }>
  >();

  const reportRows = reports ?? [];
  const postIds = [...new Set(reportRows.map((report) => report.post_id))];
  const userIds = [...new Set(reportRows.flatMap((report) => [report.reporter_id, report.reviewed_by].filter(Boolean) as string[]))];

  const [{ data: posts }, { data: profiles }] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from("community_posts")
          .select("id, title, content_html, status")
          .eq("tenant_id", tenant.id)
          .in("id", postIds)
          .returns<Array<{ id: string; title: string; content_html: string; status: CommunityPostStatus }>>()
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; content_html: string; status: CommunityPostStatus }> }),
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
          .returns<Array<{ id: string; full_name: string | null }>>()
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
  ]);

  const postMap = new Map((posts ?? []).map((post) => [post.id, post]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, toDisplayName(profile.full_name)]));

  return {
    items: reportRows.map((report) => {
      const targetPost = postMap.get(report.post_id);
      return {
        id: report.id,
        post_id: report.post_id,
        post_title: targetPost?.title ?? "삭제된 게시글",
        post_content_html: targetPost?.content_html ?? null,
        post_status: targetPost?.status,
        reporter_id: report.reporter_id,
        reporter_name: profileMap.get(report.reporter_id) ?? "Member",
        reason: report.reason,
        status: report.status,
        reviewed_by: report.reviewed_by,
        reviewed_by_name: report.reviewed_by ? (profileMap.get(report.reviewed_by) ?? "Member") : null,
        reviewed_at: report.reviewed_at,
        created_at: report.created_at,
      } satisfies AdminCommunityReportRow;
    }),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminLegalDocuments(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as AdminLegalDocumentRow[];
  }

  const { data } = await supabase
    .from("legal_documents")
    .select("id, type, locale, title, version, is_published, published_at, updated_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("type", { ascending: true })
    .order("locale", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        type: LegalDocumentType;
        locale: LegalDocumentLocale;
        title: string;
        version: string;
        is_published: boolean;
        published_at: string | null;
        updated_at: string;
        created_at: string;
      }>
    >();

  return data ?? [];
}

export async function getAdminNotices(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .returns<NoticeRow[]>();

  return data ?? [];
}

export async function getAdminNoticeById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string
) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<NoticeRow>();

  return data ?? null;
}

export async function getPublishedNotices(limit?: number) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [];
  }

  let query = supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data } = await query.returns<NoticeRow[]>();
  return data ?? [];
}

export async function getPublishedNoticeById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle<NoticeRow>();

  return data ?? null;
}

function attachOfflineClassParticipants(
  classes: OfflineClassRow[],
  registrations: OfflineClassRegistrationRow[]
): OfflineClassWithParticipants[] {
  const registrationByClassId = new Map<string, OfflineClassRegistrationRow[]>();

  registrations.forEach((registration) => {
    const rows = registrationByClassId.get(registration.class_id) ?? [];
    rows.push(registration);
    registrationByClassId.set(registration.class_id, rows);
  });

  return classes.map((offlineClass) => ({
    ...offlineClass,
    participants: registrationByClassId.get(offlineClass.id) ?? [],
  }));
}

export async function getPublishedOfflineClasses({
  limit,
  upcomingOnly = false,
}: {
  limit?: number;
  upcomingOnly?: boolean;
} = {}) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return { classes: [] as OfflineClassWithParticipants[], currentUserId: null as string | null };
  }

  let query = supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  if (upcomingOnly) {
    query = query.gt("starts_at", new Date().toISOString());
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data: classes } = await query.returns<OfflineClassRow[]>();
  const classRows = classes ?? [];

  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return { classes: [] as OfflineClassWithParticipants[], currentUserId: null as string | null };
  }

  const [{ data: registrations }, userRes] = await Promise.all([
    supabase
      .from("offline_class_registrations")
      .select("id, class_id, user_id, participant_name, created_at")
      .eq("tenant_id", tenant.id)
      .in("class_id", classIds)
      .order("created_at", { ascending: true })
      .returns<OfflineClassRegistrationRow[]>(),
    supabase.auth.getUser(),
  ]);

  const currentUserId = userRes.data.user?.id ?? null;

  return {
    classes: attachOfflineClassParticipants(classRows, registrations ?? []),
    currentUserId,
  };
}

export async function getPublishedOfflineClassById(id: string) {
  const supabase = await createSupabaseServerClient();

  const [classRes, userRes] = await Promise.all([
    supabase
      .from("offline_classes")
      .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle<OfflineClassRow>(),
    supabase.auth.getUser(),
  ]);

  if (!classRes.data) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  const [offlineClass] = attachOfflineClassParticipants([classRes.data], registrations ?? []);

  return {
    offlineClass,
    currentUserId: userRes.data.user?.id ?? null,
  };
}

export async function getAdminOfflineClasses(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as OfflineClassWithParticipants[];
  }

  const { data: classes } = await supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: true })
    .returns<OfflineClassRow[]>();

  const classRows = classes ?? [];
  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return [] as OfflineClassWithParticipants[];
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, created_at")
    .eq("tenant_id", tenant.id)
    .in("class_id", classIds)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  return attachOfflineClassParticipants(classRows, registrations ?? []);
}

export async function getAdminOfflineClassById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string
) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return null;
  }

  const { data: offlineClass } = await supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<OfflineClassRow>();

  if (!offlineClass) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, created_at")
    .eq("tenant_id", tenant.id)
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  const [withParticipants] = attachOfflineClassParticipants([offlineClass], registrations ?? []);
  return withParticipants;
}

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type AuthUserListItem = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
  email_confirmed_at?: string | null;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
  created_at: string;
};

async function listAllAuthUsers() {
  const admin = createSupabaseAdminClient();
  const perPage = 200;
  const result: AuthUserListItem[] = [];
  let page = 1;

  while (true) {
    const usersResult = await admin.auth.admin.listUsers({ page, perPage });
    const users = (usersResult.data?.users ?? []) as AuthUserListItem[];
    result.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return result;
}

export async function getAdminManagedUsers(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [] as ManagedUserRow[];
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .returns<Array<{ user_id: string; role: TenantMembershipRole }>>();

  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  if (memberIds.length === 0) {
    return [] as ManagedUserRow[];
  }

  const [{ data: profileRows }, authUsersAll] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", memberIds).returns<ProfileRow[]>(),
    listAllAuthUsers(),
  ]);

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const authUsers = authUsersAll.filter((authUser) => memberIds.includes(authUser.id));

  const mergedUsers: ManagedUserRow[] = authUsers.map((authUser) => {
    const profile = profileById.get(authUser.id);
    const fullName =
      profile?.full_name?.trim() ||
      authUser.user_metadata?.full_name?.trim() ||
      authUser.email ||
      "미등록 사용자";

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      full_name: fullName,
      role: memberRoleById.get(authUser.id) ?? "member",
      has_membership: true,
      email_confirmed: !!authUser.email_confirmed_at,
      invited_at: authUser.invited_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      created_at: authUser.created_at,
    };
  });

  return mergedUsers.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function compareNullableDate(a: string | null, b: string | null, order: "asc" | "desc") {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  return order === "asc" ? aTime - bTime : bTime - aTime;
}

function sortManagedUsers(users: ManagedUserRow[], sortBy: ManagedUserSortBy, order: "asc" | "desc") {
  const copied = [...users];

  copied.sort((a, b) => {
    if (sortBy === "full_name") {
      const compared = a.full_name.localeCompare(b.full_name, "ko");
      return order === "asc" ? compared : -compared;
    }

    if (sortBy === "last_sign_in_at") {
      return compareNullableDate(a.last_sign_in_at, b.last_sign_in_at, order);
    }

    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    return order === "asc" ? aTime - bTime : bTime - aTime;
  });

  return copied;
}

export async function getAdminManagedUsersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  {
    query,
    sortBy,
    order,
    page,
    pageSize,
  }: {
    query: string;
    sortBy: ManagedUserSortBy;
    order: "asc" | "desc";
    page: number;
    pageSize: number;
  }
): Promise<ManagedUsersPage> {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .returns<Array<{ user_id: string; role: TenantMembershipRole }>>();

  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  if (memberIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const [{ data: profileRows }, authUsersAll] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", memberIds).returns<ProfileRow[]>(),
    listAllAuthUsers(),
  ]);

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const authUsers = authUsersAll.filter((authUser) => memberIds.includes(authUser.id));

  const mergedUsers: ManagedUserRow[] = authUsers.map((authUser) => {
    const profile = profileById.get(authUser.id);
    const fullName =
      profile?.full_name?.trim() ||
      authUser.user_metadata?.full_name?.trim() ||
      authUser.email ||
      "미등록 사용자";

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      full_name: fullName,
      role: memberRoleById.get(authUser.id) ?? "member",
      has_membership: true,
      email_confirmed: !!authUser.email_confirmed_at,
      invited_at: authUser.invited_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      created_at: authUser.created_at,
    };
  });

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? mergedUsers.filter((user) => {
        const target = `${user.full_name} ${user.email}`.toLowerCase();
        return target.includes(normalizedQuery);
      })
    : mergedUsers;

  const sorted = sortManagedUsers(filtered, sortBy, order);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: sorted.slice(start, end),
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

export async function getAdminAllUsersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  {
    query,
    sortBy,
    order,
    page,
    pageSize,
  }: {
    query: string;
    sortBy: ManagedUserSortBy;
    order: "asc" | "desc";
    page: number;
    pageSize: number;
  }
): Promise<ManagedUsersPage> {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const [{ data: memberships }, authUsersAll] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("user_id, role")
      .eq("tenant_id", tenant.id)
      .returns<Array<{ user_id: string; role: TenantMembershipRole }>>(),
    listAllAuthUsers(),
  ]);

  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  const authUserIds = authUsersAll.map((user) => user.id);

  const { data: profileRows } = authUserIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authUserIds).returns<ProfileRow[]>()
    : { data: [] as ProfileRow[] };

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));

  const mergedUsers: ManagedUserRow[] = authUsersAll.map((authUser) => {
    const profile = profileById.get(authUser.id);
    const fullName =
      profile?.full_name?.trim() ||
      authUser.user_metadata?.full_name?.trim() ||
      authUser.email ||
      "미등록 사용자";

    const membershipRole = memberRoleById.get(authUser.id);

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      full_name: fullName,
      role: membershipRole ?? "member",
      has_membership: Boolean(membershipRole),
      email_confirmed: !!authUser.email_confirmed_at,
      invited_at: authUser.invited_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      created_at: authUser.created_at,
    };
  });

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? mergedUsers.filter((user) => {
        const target = `${user.full_name} ${user.email}`.toLowerCase();
        return target.includes(normalizedQuery);
      })
    : mergedUsers;

  const sorted = sortManagedUsers(filtered, sortBy, order);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: sorted.slice(start, end),
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}
