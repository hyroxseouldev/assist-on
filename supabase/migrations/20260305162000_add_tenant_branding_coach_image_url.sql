alter table public.tenant_branding
add column if not exists coach_image_url text not null default '';
