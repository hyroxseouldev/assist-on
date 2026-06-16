export type MediaBucket = "avatars" | "content-media";

export type MediaDomainType =
  | "profile_avatar"
  | "program_logo"
  | "session_content"
  | "notice_content"
  | "offline_class_content"
  | "location_content"
  | "community_post"
  | "community_comment"
  | "partner_discount_brand_logo";

export type UploadedMedia = {
  bucket: MediaBucket;
  path: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};
