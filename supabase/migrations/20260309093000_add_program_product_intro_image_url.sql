alter table if exists public.program_products
  add column if not exists intro_image_url text not null default '';
