"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MediaBucket, MediaDomainType } from "@/lib/media/types";

type RegisterMediaInput = {
  bucket: MediaBucket;
  path: string;
  publicUrl: string;
  domainType: MediaDomainType;
  domainId?: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export async function registerMediaAssetAction(input: RegisterMediaInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("media_assets").insert({
    bucket: input.bucket,
    path: input.path,
    public_url: input.publicUrl,
    owner_id: user.id,
    uploaded_by: user.id,
    domain_type: input.domainType,
    domain_id: input.domainId ?? null,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    width: input.width,
    height: input.height,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "미디어 메타가 저장되었습니다." };
}

export async function reportMediaAssetAction(mediaId: string, reason: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  if (!mediaId || !reason.trim()) {
    return { ok: false, message: "신고 사유를 입력해 주세요." };
  }

  const { error } = await supabase.from("media_reports").insert({
    media_id: mediaId,
    reporter_id: user.id,
    reason: reason.trim(),
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "신고가 접수되었습니다." };
}

export async function removeMediaAssetAction(mediaId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "admin" }>();

  const isAdmin = profile?.role === "admin";

  const { data: media, error: mediaError } = await supabase
    .from("media_assets")
    .select("id, bucket, path, uploaded_by")
    .eq("id", mediaId)
    .maybeSingle<{ id: string; bucket: MediaBucket; path: string; uploaded_by: string }>();

  if (mediaError || !media) {
    return { ok: false, message: "삭제할 미디어를 찾지 못했습니다." };
  }

  if (media.uploaded_by !== user.id && !isAdmin) {
    return { ok: false, message: "삭제 권한이 없습니다." };
  }

  const { error: removeError } = await supabase.storage.from(media.bucket).remove([media.path]);
  if (removeError) {
    return { ok: false, message: removeError.message };
  }

  const { error: updateError } = await supabase
    .from("media_assets")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", media.id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  return { ok: true, message: "미디어가 삭제되었습니다." };
}

export async function updateMyAvatarUrlAction(avatarUrl: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "프로필 사진이 업데이트되었습니다." };
}
