export type MediaBucket = "avatars" | "content-media";

export type MediaDomainType = "profile_avatar" | "session_content" | "community_post" | "community_comment";

export type UploadedMedia = {
  bucket: MediaBucket;
  path: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};
