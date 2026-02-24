# Supabase Auth Setup

## Required Environment Variables

Set these in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<your-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Dashboard Settings

Open **Authentication > URL Configuration** and set:

- Site URL: `http://localhost:3000` (local)
- Redirect URLs:
  - `http://localhost:3000/auth/confirm`
  - `https://<your-production-domain>/auth/confirm`

`/reset-password` uses:

- `redirectTo: ${NEXT_PUBLIC_APP_URL}/auth/confirm?next=/update-password`

This route exchanges the auth code to a server session, then redirects to `/update-password`.

## Database Trigger and Profile Table

Migration `create_profiles_with_auth_trigger` was applied using MCP.

It creates:

- `public.profiles` table
- RLS policies (own read/update/insert)
- `on_auth_user_created` trigger on `auth.users`

On signup, a profile row is auto-created with:

- `id` from `auth.users.id`
- `full_name` from `raw_user_meta_data.full_name`
- `avatar_url` from `raw_user_meta_data.avatar_url`
