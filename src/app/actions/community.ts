"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { sanitizeCommunityContent } from "@/lib/sanitize/community-content";

export type CommunityActionResult = {
  ok: boolean;
  message: string;
  postId?: string;
  liked?: boolean;
  likeCount?: number;
};

async function ensureAuthenticated() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "admin" }>();

  return {
    supabase,
    user,
    isAdmin: profile?.role === "admin",
  };
}

function revalidateCommunityPaths(postId?: string) {
  revalidatePath("/community");
  if (postId) {
    revalidatePath(`/community/${postId}`);
    revalidatePath(`/community/${postId}/edit`);
  }
}

function asOk(message: string, payload?: Partial<CommunityActionResult>): CommunityActionResult {
  return {
    ok: true,
    message,
    ...payload,
  };
}

function asFail(error: unknown, fallback: string): CommunityActionResult {
  if (error instanceof Error && error.message) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: fallback };
}

function normalizePostPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();
  const sanitizedHtml = sanitizeCommunityContent(contentHtml);

  if (!title) {
    throw new Error("제목을 입력해 주세요.");
  }

  if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
    throw new Error("본문을 입력해 주세요.");
  }

  return {
    title,
    contentHtml: sanitizedHtml,
  };
}

export async function createCommunityPostAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user } = await ensureAuthenticated();
    const payload = normalizePostPayload(formData);

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: user.id,
        title: payload.title,
        content_html: payload.contentHtml,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      return { ok: false, message: error?.message ?? "게시글 생성에 실패했습니다." };
    }

    revalidateCommunityPaths(data.id);
    return asOk("게시글이 등록되었습니다.", { postId: data.id });
  } catch (error) {
    return asFail(error, "게시글 생성에 실패했습니다.");
  }
}

export async function updateCommunityPostAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user, isAdmin } = await ensureAuthenticated();
    const postId = String(formData.get("postId") ?? "").trim();

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    const { data: existingPost } = await supabase
      .from("community_posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle<{ id: string; author_id: string }>();

    if (!existingPost) {
      return { ok: false, message: "게시글을 찾지 못했습니다." };
    }

    if (existingPost.author_id !== user.id && !isAdmin) {
      return { ok: false, message: "수정 권한이 없습니다." };
    }

    const payload = normalizePostPayload(formData);
    const { error } = await supabase
      .from("community_posts")
      .update({
        title: payload.title,
        content_html: payload.contentHtml,
      })
      .eq("id", postId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateCommunityPaths(postId);
    return asOk("게시글이 수정되었습니다.", { postId });
  } catch (error) {
    return asFail(error, "게시글 수정에 실패했습니다.");
  }
}

export async function deleteCommunityPostAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user, isAdmin } = await ensureAuthenticated();
    const postId = String(formData.get("postId") ?? "").trim();

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    const { data: existingPost } = await supabase
      .from("community_posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle<{ id: string; author_id: string }>();

    if (!existingPost) {
      return { ok: false, message: "게시글을 찾지 못했습니다." };
    }

    if (existingPost.author_id !== user.id && !isAdmin) {
      return { ok: false, message: "삭제 권한이 없습니다." };
    }

    const { error } = await supabase
      .from("community_posts")
      .update({
        status: "deleted",
      })
      .eq("id", postId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateCommunityPaths(postId);
    return asOk("게시글이 삭제되었습니다.");
  } catch (error) {
    return asFail(error, "게시글 삭제에 실패했습니다.");
  }
}

export async function toggleCommunityPostLikeAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user } = await ensureAuthenticated();
    const postId = String(formData.get("postId") ?? "").trim();

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    const { data: existingLike } = await supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle<{ post_id: string }>();

    if (existingLike) {
      const { error } = await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) {
        return { ok: false, message: error.message };
      }
    } else {
      const { error } = await supabase.from("community_post_likes").insert({
        post_id: postId,
        user_id: user.id,
      });

      if (error) {
        return { ok: false, message: error.message };
      }
    }

    const { data: likes } = await supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .returns<Array<{ post_id: string }>>();

    const liked = !existingLike;
    const likeCount = (likes ?? []).length;
    revalidateCommunityPaths(postId);

    return asOk(liked ? "좋아요를 눌렀습니다." : "좋아요를 취소했습니다.", {
      liked,
      likeCount,
      postId,
    });
  } catch (error) {
    return asFail(error, "좋아요 처리에 실패했습니다.");
  }
}

function normalizeCommentContent(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("댓글 내용을 입력해 주세요.");
  }

  return sanitizeSessionContent(trimmed.replace(/\n/g, "<br />"));
}

export async function createCommunityCommentAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user } = await ensureAuthenticated();
    const postId = String(formData.get("postId") ?? "").trim();
    const rawContent = String(formData.get("content") ?? "");

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    const contentHtml = normalizeCommentContent(rawContent);

    const { error } = await supabase.from("community_comments").insert({
      post_id: postId,
      author_id: user.id,
      content_html: contentHtml,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateCommunityPaths(postId);
    return asOk("댓글이 등록되었습니다.");
  } catch (error) {
    return asFail(error, "댓글 등록에 실패했습니다.");
  }
}

export async function deleteCommunityCommentAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user, isAdmin } = await ensureAuthenticated();
    const commentId = String(formData.get("commentId") ?? "").trim();
    const postId = String(formData.get("postId") ?? "").trim();

    if (!commentId || !postId) {
      return { ok: false, message: "댓글 식별자가 없습니다." };
    }

    const { data: comment } = await supabase
      .from("community_comments")
      .select("id, author_id")
      .eq("id", commentId)
      .maybeSingle<{ id: string; author_id: string }>();

    if (!comment) {
      return { ok: false, message: "댓글을 찾지 못했습니다." };
    }

    if (comment.author_id !== user.id && !isAdmin) {
      return { ok: false, message: "댓글 삭제 권한이 없습니다." };
    }

    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateCommunityPaths(postId);
    return asOk("댓글이 삭제되었습니다.");
  } catch (error) {
    return asFail(error, "댓글 삭제에 실패했습니다.");
  }
}

export async function reportCommunityPostAction(formData: FormData): Promise<CommunityActionResult> {
  try {
    const { supabase, user } = await ensureAuthenticated();
    const postId = String(formData.get("postId") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    if (reason.length < 5) {
      return { ok: false, message: "신고 사유를 5자 이상 입력해 주세요." };
    }

    const { data: post } = await supabase
      .from("community_posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle<{ id: string; author_id: string }>();

    if (!post) {
      return { ok: false, message: "신고할 게시글을 찾지 못했습니다." };
    }

    if (post.author_id === user.id) {
      return { ok: false, message: "본인 게시글은 신고할 수 없습니다." };
    }

    const { error } = await supabase.from("community_post_reports").insert({
      post_id: postId,
      reporter_id: user.id,
      reason,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateCommunityPaths(postId);
    return asOk("신고가 접수되었습니다.");
  } catch (error) {
    return asFail(error, "신고 접수에 실패했습니다.");
  }
}
