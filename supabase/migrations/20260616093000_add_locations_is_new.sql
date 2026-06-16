alter table public.locations
add column if not exists is_new boolean not null default false;
