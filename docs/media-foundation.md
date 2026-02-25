# Media Foundation Setup

This project uses Supabase Storage + DB metadata for community-safe image uploads.

## Buckets

- `avatars` (public, max 3MB)
- `content-media` (public, max 8MB)

Allowed mime types:

- `image/jpeg`
- `image/png`
- `image/webp`

## DB Tables

- `public.media_assets`
  - Tracks uploaded media metadata and ownership.
  - Supports moderation with `status` (`active | hidden | deleted`).
- `public.media_reports`
  - Stores user reports for moderation flow.

## Permission Model

- Upload: authenticated users
- Delete: uploader or admin
- Report: authenticated users

## Client Utilities

- `src/lib/media/upload-client.ts`
  - Validates image type
  - Resizes image before upload
  - Converts to WebP
  - Uploads to Supabase Storage

## Server Actions

- `registerMediaAssetAction`
- `removeMediaAssetAction`
- `reportMediaAssetAction`
- `updateMyAvatarUrlAction`

These are in `src/app/actions/media.ts`.
