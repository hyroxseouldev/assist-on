alter table if exists public.tenant_branding
  add column if not exists program_card_image_url text not null default '';
