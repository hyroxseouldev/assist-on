"use client";

import { registerMediaAssetAction } from "@/app/actions/media";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function uploadNoticeContentImage(file: File, noticeId?: string) {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("이미지 업로드를 위해 로그인이 필요합니다.");
  }

  const uploaded = await uploadImageToStorage(file, {
    bucket: "content-media",
    userId: user.id,
    domainFolder: "notices",
    maxDimension: 1600,
    quality: 0.8,
  });

  const metaResult = await registerMediaAssetAction({
    bucket: uploaded.bucket,
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    domainType: "notice_content",
    domainId: noticeId,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
    width: uploaded.width,
    height: uploaded.height,
  });

  if (!metaResult.ok) {
    throw new Error(metaResult.message);
  }

  return uploaded.publicUrl;
}

export async function uploadNoticeThumbnailImage(file: File, noticeId?: string) {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("이미지 업로드를 위해 로그인이 필요합니다.");
  }

  const uploaded = await uploadImageToStorage(file, {
    bucket: "content-media",
    userId: user.id,
    domainFolder: "notice-thumbnail",
    maxDimension: 1024,
    quality: 0.9,
  });

  const metaResult = await registerMediaAssetAction({
    bucket: uploaded.bucket,
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    domainType: "notice_content",
    domainId: noticeId,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
    width: uploaded.width,
    height: uploaded.height,
  });

  if (!metaResult.ok) {
    throw new Error(metaResult.message);
  }

  return uploaded.publicUrl;
}
