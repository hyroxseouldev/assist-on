# Mobile Locations Guide

This guide describes how mobile clients should consume public location data.

## DB Contract

- Table: `public.locations`
- Public rows: `is_published = true`
- Suggested fields:
  - `id`
  - `name`
  - `address`
  - `description`
  - `thumbnail_url`
  - `image_urls`
  - `map_image_url`
  - `amenities`
  - `sort_order`
  - `is_new`

## Images

- `thumbnail_url`: primary card/list image.
- `image_urls`: detail gallery images, max 5.
- `map_image_url`: uploaded map image.

Recommended fallback order:

```ts
thumbnail_url || image_urls[0] || map_image_url
```

## Amenities

`amenities` is a JSON array. Each item has this shape:

```json
{
  "label": "샤워시설",
  "description": "남녀 분리 샤워실 운영",
  "iconKey": "shower"
}
```

Supported `iconKey` values:

- `dumbbell`
- `shower`
- `map-pin`
- `car`
- `wifi`
- `clock`
- `users`
- `ruler`
- `circle-dot`

Mobile apps should map `iconKey` strings to native icons. Use `circle-dot` as the fallback for unknown keys.

## New Badge

- `is_new`: when `true`, show a "신규 지점" badge on location cards and detail screens.
