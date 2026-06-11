alter table public.offline_classes
add column if not exists subtitle text not null default '';

alter table public.offline_classes
add column if not exists address_text text not null default '';

alter table public.offline_classes
add column if not exists registration_opens_at timestamptz;

alter table public.offline_classes
add column if not exists registration_closes_at timestamptz;

alter table public.offline_classes
add column if not exists cancellation_closes_at timestamptz;

alter table public.offline_classes
add column if not exists thumbnail_url text not null default '';

alter table public.offline_classes
add column if not exists mobile_visibility text not null default 'public';

alter table public.offline_classes
add column if not exists coach_profile_id uuid references public.coach_profiles(id) on delete set null;

alter table public.offline_classes
drop constraint if exists offline_classes_mobile_visibility_check;

alter table public.offline_classes
add constraint offline_classes_mobile_visibility_check
check (mobile_visibility in ('public', 'private'));

alter table public.offline_classes
drop constraint if exists offline_classes_registration_window_order_check;

alter table public.offline_classes
add constraint offline_classes_registration_window_order_check
check (
  registration_opens_at is null
  or registration_closes_at is null
  or registration_closes_at > registration_opens_at
);

create index if not exists idx_offline_classes_tenant_registration_window
on public.offline_classes (tenant_id, registration_opens_at, registration_closes_at);

create index if not exists idx_offline_classes_coach_profile_id
on public.offline_classes (coach_profile_id);

alter table public.offline_class_registrations
add column if not exists status text;

alter table public.offline_class_registrations
add column if not exists confirmed_at timestamptz;

alter table public.offline_class_registrations
add column if not exists confirmed_by uuid references auth.users(id) on delete set null;

alter table public.offline_class_registrations
add column if not exists reviewed_at timestamptz;

alter table public.offline_class_registrations
add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.offline_class_registrations
set status = 'confirmed',
    confirmed_at = coalesce(confirmed_at, created_at)
where status is null
   or status not in ('pending', 'confirmed', 'rejected', 'canceled');

alter table public.offline_class_registrations
alter column status set default 'pending';

alter table public.offline_class_registrations
alter column status set not null;

alter table public.offline_class_registrations
drop constraint if exists offline_class_registrations_status_check;

alter table public.offline_class_registrations
add constraint offline_class_registrations_status_check
check (status in ('pending', 'confirmed', 'rejected', 'canceled'));

create index if not exists idx_offline_class_registrations_class_status
on public.offline_class_registrations (class_id, status);

create or replace function public.register_offline_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_class record;
  v_existing_registration record;
  v_participant_name text;
  v_now timestamptz := now();
  v_registration_closes_at timestamptz;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id, tenant_id, starts_at, registration_opens_at, registration_closes_at, is_published
  into v_class
  from public.offline_classes
  where id = p_class_id
  for update;

  if not found then
    raise exception '클래스를 찾지 못했습니다.';
  end if;

  if v_class.tenant_id is null then
    raise exception '테넌트 정보가 없는 클래스입니다.';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = v_class.tenant_id
      and tm.user_id = v_user_id
  ) then
    raise exception '해당 테넌트 멤버만 신청할 수 있습니다.';
  end if;

  if not v_class.is_published then
    raise exception '비공개 클래스는 신청할 수 없습니다.';
  end if;

  if v_class.registration_opens_at is not null and v_now < v_class.registration_opens_at then
    raise exception '아직 예약 신청이 시작되지 않았습니다.';
  end if;

  v_registration_closes_at := coalesce(v_class.registration_closes_at, v_class.starts_at);
  if v_now >= v_registration_closes_at then
    raise exception '예약 신청 시간이 마감되었습니다.';
  end if;

  select id, status
  into v_existing_registration
  from public.offline_class_registrations r
  where r.class_id = p_class_id
    and r.user_id = v_user_id
  for update;

  if found then
    if v_existing_registration.status in ('pending', 'confirmed') then
      raise exception '이미 신청한 클래스입니다.';
    end if;

    update public.offline_class_registrations
    set status = 'pending',
        reviewed_at = null,
        reviewed_by = null,
        confirmed_at = null,
        confirmed_by = null
    where id = v_existing_registration.id;

    return;
  end if;

  select nullif(trim(full_name), '')
  into v_participant_name
  from public.profiles
  where id = v_user_id;

  insert into public.offline_class_registrations (class_id, user_id, participant_name, tenant_id, status)
  values (p_class_id, v_user_id, coalesce(v_participant_name, '참가자'), v_class.tenant_id, 'pending');
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
  v_class record;
  v_registration record;
  v_now timestamptz := now();
  v_cancellation_closes_at timestamptz;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id, tenant_id, starts_at, cancellation_closes_at
  into v_class
  from public.offline_classes
  where id = p_class_id
  for update;

  if not found then
    raise exception '클래스를 찾지 못했습니다.';
  end if;

  if v_class.tenant_id is null then
    raise exception '테넌트 정보가 없는 클래스입니다.';
  end if;

  if not exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = v_class.tenant_id
      and tm.user_id = v_user_id
  ) then
    raise exception '해당 테넌트 멤버만 신청을 취소할 수 있습니다.';
  end if;

  v_cancellation_closes_at := coalesce(v_class.cancellation_closes_at, v_class.starts_at);
  if v_now >= v_cancellation_closes_at then
    raise exception '예약 취소 시간이 마감되었습니다.';
  end if;

  select id, status
  into v_registration
  from public.offline_class_registrations
  where class_id = p_class_id
    and user_id = v_user_id
    and tenant_id = v_class.tenant_id
  for update;

  if not found or v_registration.status not in ('pending', 'confirmed') then
    raise exception '취소할 신청 내역이 없습니다.';
  end if;

  update public.offline_class_registrations
  set status = 'canceled',
      reviewed_at = v_now,
      reviewed_by = v_user_id,
      confirmed_at = null,
      confirmed_by = null
  where id = v_registration.id;
end;
$$;

revoke all on function public.register_offline_class(uuid) from public;
revoke execute on function public.register_offline_class(uuid) from anon;
grant execute on function public.register_offline_class(uuid) to authenticated;

revoke all on function public.cancel_offline_class_registration(uuid) from public;
revoke execute on function public.cancel_offline_class_registration(uuid) from anon;
grant execute on function public.cancel_offline_class_registration(uuid) to authenticated;
