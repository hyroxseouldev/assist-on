"use client";

import { registerMediaAssetAction } from "@/app/actions/media";
import { uploadVideoToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function uploadYoutubePreviewVideo(file: File, contentId?: string) {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("미리보기 영상 업로드를 위해 로그인이 필요합니다.");
  }

  const uploaded = await uploadVideoToStorage(file, {
    bucket: "content-media",
    userId: user.id,
    domainFolder: "youtube-preview-videos",
  });

  const metaResult = await registerMediaAssetAction({
    bucket: uploaded.bucket,
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    domainType: "youtube_preview_video",
    domainId: contentId,
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
    width: uploaded.width,
    height: uploaded.height,
  });

  if (!metaResult.ok) {
    throw new Error(metaResult.message);
  }

  return uploaded;
}
