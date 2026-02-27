with class_tenant as (
  select id, tenant_id
  from public.offline_classes
  where tenant_id is not null
)
update public.offline_class_registrations r
set tenant_id = ct.tenant_id
from class_tenant ct
where r.class_id = ct.id
  and r.tenant_id is null;

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

  select id, tenant_id, starts_at, capacity, is_published
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

  insert into public.offline_class_registrations (class_id, user_id, participant_name, tenant_id)
  values (p_class_id, v_user_id, coalesce(v_participant_name, '참가자'), v_class.tenant_id);
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
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id, tenant_id, starts_at
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

  if now() >= v_class.starts_at then
    raise exception '클래스 시작 이후에는 취소할 수 없습니다.';
  end if;

  delete from public.offline_class_registrations
  where class_id = p_class_id
    and user_id = v_user_id
    and tenant_id = v_class.tenant_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception '취소할 신청 내역이 없습니다.';
  end if;
end;
$$;
