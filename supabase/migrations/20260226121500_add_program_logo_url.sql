alter table public.programs
add column if not exists logo_url text not null default '';
