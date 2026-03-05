# Mobile Community Images Guide

This guide describes how to use `community_posts.images` for a thread-like mobile community UX.

## DB Contract

- Table: `public.community_posts`
- Column: `images jsonb not null default '[]'::jsonb`
- Constraint: `jsonb_typeof(images) = 'array'`
- Expected shape: array of image URL strings

Example:

```json
[
  "https://.../community-posts/a.webp",
  "https://.../community-posts/b.webp"
]
```

## Recommended Product Rules

- Max images per post: `4`
- Allowed formats: `jpg`, `png`, `webp`
- Recommended upload conversion: `webp`
- Empty images allowed: yes (`[]`)

## API / Action Payload

For create and update requests, include:

- `title: string`
- `contentHtml: string`
- `images: string[]`

Server-side validation:

1. `images` must be an array
2. `images.length <= 4`
3. each element must be a non-empty URL string

## Mobile Rendering Pattern

- Feed card:
  - show first image as preview if `images.length > 0`
  - show badge `+N` when there are multiple images
- Post detail:
  - 1 image: full width
  - 2 images: 2-column grid
  - 3-4 images: 2x2 grid

## Thread-like UX Next Step

If you want true thread behavior, add these in a follow-up migration:

- `parent_post_id uuid null references public.community_posts(id) on delete cascade`
- `post_type text not null default 'post' check (post_type in ('post','reply'))`

Then render feed with root posts and nested replies.
