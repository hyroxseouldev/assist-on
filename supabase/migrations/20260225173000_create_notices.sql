create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content_html text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_notices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notices_updated_at on public.notices;
create trigger trg_notices_updated_at
before update on public.notices
for each row
execute function public.touch_notices_updated_at();

alter table public.notices enable row level security;

drop policy if exists "Authenticated can read published notices" on public.notices;
create policy "Authenticated can read published notices"
on public.notices
for select
to authenticated
using (is_published = true);

drop policy if exists "Admins can manage notices" on public.notices;
create policy "Admins can manage notices"
on public.notices
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));
