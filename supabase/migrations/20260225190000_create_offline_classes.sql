create table if not exists public.offline_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content_html text not null default '',
  location_text text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  is_published boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offline_classes_capacity_positive check (capacity > 0),
  constraint offline_classes_time_order check (ends_at > starts_at)
);

create index if not exists idx_offline_classes_starts_at on public.offline_classes (starts_at);

create or replace function public.touch_offline_classes_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_offline_classes_updated_at on public.offline_classes;
create trigger trg_offline_classes_updated_at
before update on public.offline_classes
for each row
execute function public.touch_offline_classes_updated_at();

create table if not exists public.offline_class_registrations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.offline_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_name text not null default '',
  created_at timestamptz not null default now(),
  constraint offline_class_registrations_unique unique (class_id, user_id)
);

create index if not exists idx_offline_class_registrations_class_id on public.offline_class_registrations (class_id);

alter table public.offline_classes enable row level security;
alter table public.offline_class_registrations enable row level security;

drop policy if exists "Authenticated can read published offline classes" on public.offline_classes;
create policy "Authenticated can read published offline classes"
on public.offline_classes
for select
to authenticated
using (is_published = true);

drop policy if exists "Admins can manage offline classes" on public.offline_classes;
create policy "Admins can manage offline classes"
on public.offline_classes
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop policy if exists "Authenticated can read published class participants" on public.offline_class_registrations;
create policy "Authenticated can read published class participants"
on public.offline_class_registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.offline_classes c
    where c.id = class_id
      and c.is_published = true
  )
);

drop policy if exists "Admins can manage class participants" on public.offline_class_registrations;
create policy "Admins can manage class participants"
on public.offline_class_registrations
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create or replace function public.register_offline_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_class record;
  v_participant_count integer;
  v_participant_name text;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id, starts_at, capacity, is_published
  into v_class
  from public.offline_classes
  where id = p_class_id
  for update;

  if not found then
    raise exception '클래스를 찾지 못했습니다.';
  end if;

  if not v_class.is_published then
    raise exception '비공개 클래스는 신청할 수 없습니다.';
  end if;

  if now() >= v_class.starts_at then
    raise exception '클래스 시작 이후에는 신청할 수 없습니다.';
  end if;

  if exists (
    select 1
    from public.offline_class_registrations r
    where r.class_id = p_class_id
      and r.user_id = v_user_id
  ) then
    raise exception '이미 신청한 클래스입니다.';
  end if;

  select count(*)
  into v_participant_count
  from public.offline_class_registrations r
  where r.class_id = p_class_id;

  if v_participant_count >= v_class.capacity then
    raise exception '정원이 마감되었습니다.';
  end if;

  select nullif(trim(full_name), '')
  into v_participant_name
  from public.profiles
  where id = v_user_id;

  insert into public.offline_class_registrations (class_id, user_id, participant_name)
  values (p_class_id, v_user_id, coalesce(v_participant_name, '참가자'));
end;
$$;

create or replace function public.cancel_offline_class_registration(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_starts_at timestamptz;
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select starts_at
  into v_starts_at
  from public.offline_classes
  where id = p_class_id
  for update;

  if not found then
    raise exception '클래스를 찾지 못했습니다.';
  end if;

  if now() >= v_starts_at then
    raise exception '클래스 시작 이후에는 취소할 수 없습니다.';
  end if;

  delete from public.offline_class_registrations
  where class_id = p_class_id
    and user_id = v_user_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception '취소할 신청 내역이 없습니다.';
  end if;
end;
$$;

revoke all on function public.register_offline_class(uuid) from public;
grant execute on function public.register_offline_class(uuid) to authenticated;

revoke all on function public.cancel_offline_class_registration(uuid) from public;
grant execute on function public.cancel_offline_class_registration(uuid) to authenticated;
