import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";
import type {
  CommunityCommentItem,
  CommunityCommentRow,
  CommunityFeedItem,
  CommunityPostDetail,
  CommunityPostRow,
  CommunityProfileMap,
} from "@/lib/community/types";

function formatDisplayName(fullName: string | null, email?: string) {
  if (fullName && fullName.trim().length > 0) {
    return fullName;
  }

  if (email && email.length > 0) {
    return email.split("@")[0] || "Member";
  }

  return "Member";
}

function collectUniqueIds(rows: Array<{ author_id: string }>) {
  return [...new Set(rows.map((row) => row.author_id))];
}

async function getProfileMap(authorIds: string[]): Promise<CommunityProfileMap> {
  if (authorIds.length === 0) {
    return {};
  }

  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", authorIds)
    .returns<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>();

  const result: CommunityProfileMap = {};
  (profiles ?? []).forEach((profile) => {
    result[profile.id] = {
      fullName: formatDisplayName(profile.full_name),
      avatarUrl: profile.avatar_url,
    };
  });

  return result;
}

function countByPostId(rows: Array<{ post_id: string }>) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.post_id] = (acc[row.post_id] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getCommunityFeed(limit = 20): Promise<CommunityFeedItem[]> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);

  if (!tenant) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: posts } = await supabase
    .from("community_posts")
    .select("id, author_id, title, content_html, status, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CommunityPostRow[]>();

  const postRows = posts ?? [];
  const postIds = postRows.map((post) => post.id);
  const authorIds = collectUniqueIds(postRows);

  const [profileMap, likesRes, commentsRes, likedRes] = await Promise.all([
    getProfileMap(authorIds),
    postIds.length
      ? supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    postIds.length
      ? supabase
          .from("community_comments")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .eq("status", "published")
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    postIds.length
      ? supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .eq("user_id", user.id)
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
  ]);

  const likeCountMap = countByPostId(likesRes.data ?? []);
  const commentCountMap = countByPostId(commentsRes.data ?? []);
  const likedSet = new Set((likedRes.data ?? []).map((item) => item.post_id));

  return postRows.map((post) => {
    const profile = profileMap[post.author_id];

    return {
      id: post.id,
      title: post.title,
      contentHtml: post.content_html,
      createdAt: post.created_at,
      authorId: post.author_id,
      authorName: profile?.fullName ?? "Member",
      authorAvatarUrl: profile?.avatarUrl ?? null,
      likeCount: likeCountMap[post.id] ?? 0,
      commentCount: commentCountMap[post.id] ?? 0,
      likedByMe: likedSet.has(post.id),
    };
  });
}

function mapCommentItem(comment: CommunityCommentRow, profileMap: CommunityProfileMap, currentUserId: string | null, isAdmin: boolean): CommunityCommentItem {
  const profile = profileMap[comment.author_id];

  return {
    id: comment.id,
    postId: comment.post_id,
    contentHtml: comment.content_html,
    createdAt: comment.created_at,
    authorId: comment.author_id,
    authorName: profile?.fullName ?? "Member",
    authorAvatarUrl: profile?.avatarUrl ?? null,
    canEdit: Boolean(currentUserId && (currentUserId === comment.author_id || isAdmin)),
  };
}

export async function getCommunityPostDetail(postId: string): Promise<CommunityPostDetail | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);

  if (!tenant) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: post }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: "user" | "admin" }>(),
    supabase
      .from("community_posts")
      .select("id, author_id, title, content_html, status, created_at, updated_at")
      .eq("tenant_id", tenant.id)
      .eq("id", postId)
      .maybeSingle<CommunityPostRow>(),
  ]);

  if (!post) {
    return null;
  }

  const isAdmin = profile?.role === "admin";
  const canAccess = post.status === "published" || post.author_id === user.id || isAdmin;
  if (!canAccess) {
    return null;
  }

  const { data: comments } = await supabase
    .from("community_comments")
    .select("id, post_id, author_id, content_html, status, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("post_id", post.id)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .returns<CommunityCommentRow[]>();

  const commentRows = comments ?? [];
  const authorIds = collectUniqueIds([post, ...commentRows]);

  const [profileMap, likesRes, likedRes] = await Promise.all([
    getProfileMap(authorIds),
    supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .eq("post_id", post.id)
      .returns<Array<{ post_id: string }>>(),
    supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle<{ post_id: string }>(),
  ]);

  const postProfile = profileMap[post.author_id];

  return {
    id: post.id,
    title: post.title,
    contentHtml: post.content_html,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    status: post.status,
    authorId: post.author_id,
    authorName: postProfile?.fullName ?? "Member",
    authorAvatarUrl: postProfile?.avatarUrl ?? null,
    likeCount: (likesRes.data ?? []).length,
    commentCount: commentRows.length,
    likedByMe: Boolean(likedRes.data),
    canEdit: post.author_id === user.id || isAdmin,
    comments: commentRows.map((comment) => mapCommentItem(comment, profileMap, user.id, isAdmin)),
  };
}
