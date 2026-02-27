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
  AdminCommunityPostRow,
  AdminCommunityReportRow,
  AdminRole,
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
  TenantMembershipRole,
} from "@/lib/admin/types";

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
    .select("id, team_name, logo_url, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  if (!program) {
    return null;
  }

  return programToEditorData(program);
}

export async function getSessions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, week, day_label, title, content_html")
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

export async function getAdminNotices(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const tenant = await getTenantBySlug(supabase);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, is_published, created_at, updated_at")
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
    .select("id, title, content_html, is_published, created_at, updated_at")
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
    .select("id, title, content_html, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data } = await query.returns<NoticeRow[]>();
  return data ?? [];
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
  role: AdminRole;
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

  const [{ data: profileRows }, usersResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").in("id", memberIds).returns<ProfileRow[]>(),
    createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const authUsers = ((usersResult.data?.users ?? []) as AuthUserListItem[]).filter((authUser) => memberIds.includes(authUser.id));

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

  const [{ data: profileRows }, usersResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").in("id", memberIds).returns<ProfileRow[]>(),
    createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const authUsers = ((usersResult.data?.users ?? []) as AuthUserListItem[]).filter((authUser) => memberIds.includes(authUser.id));

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
