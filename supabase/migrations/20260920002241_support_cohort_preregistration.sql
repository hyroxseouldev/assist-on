alter table public.entitlement_auto_grants
  add column cohort_id uuid references public.program_cohorts(id) on delete restrict;
create index entitlement_auto_grants_cohort_idx on public.entitlement_auto_grants(cohort_id);

drop function public.register_assigned_program_roster(uuid,uuid,uuid,jsonb,timestamptz,timestamptz,timestamptz);
create function public.register_assigned_program_roster(p_tenant_id uuid,p_program_id uuid,p_actor_id uuid,
  p_rows jsonb,p_starts_at timestamptz,p_ends_at timestamptz,p_expires_at timestamptz,p_cohort_id uuid default null)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare inserted integer; target public.programs%rowtype; cohort public.program_cohorts%rowtype;
begin
  select * into target from public.programs where tenant_id=p_tenant_id and id=p_program_id for share;
  if not found then raise exception '프로그램을 찾을 수 없습니다.'; end if;
  if not public.can_manage_assigned_program(p_tenant_id,p_program_id,p_actor_id) then
    raise exception '담당 프로그램만 사전등록할 수 있습니다.' using errcode='42501';
  end if;
  if target.delivery_mode='cohort_based' then
    select * into cohort from public.program_cohorts where id=p_cohort_id and tenant_id=p_tenant_id and program_id=p_program_id for share;
    if not found then raise exception '프로그램의 기수를 선택해 주세요.'; end if;
    if target.content_starts_on is null or target.content_ends_on is null or target.content_ends_on<target.content_starts_on then
      raise exception '기수제 콘텐츠 기준일을 확인해 주세요.';
    end if;
    p_starts_at := cohort.starts_on::timestamp at time zone 'Asia/Seoul';
    p_ends_at := (cohort.starts_on + (target.content_ends_on-target.content_starts_on) + time '23:59:59') at time zone 'Asia/Seoul';
  elsif p_cohort_id is not null then
    raise exception '날짜 고정형 프로그램에는 기수를 지정할 수 없습니다.';
  end if;
  if p_starts_at is null or p_ends_at is null or p_expires_at is null or p_starts_at>p_ends_at or p_expires_at>p_ends_at or p_expires_at<=now() then
    raise exception '이용 기간과 가입 마감일을 확인해 주세요.';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 200 then
    raise exception '명단은 1~200명까지 입력해 주세요.';
  end if;
  if exists(select 1 from jsonb_to_recordset(p_rows) as r(full_name text,phone_number text)
    where full_name is null or length(btrim(full_name)) not between 1 and 100 or phone_number is null or phone_number !~ '^01[016789][0-9]{7,8}$') then
    raise exception '이름과 전화번호를 확인해 주세요.';
  end if;
  insert into public.entitlement_auto_grants(tenant_id,program_id,full_name,phone_number,phone_number_digits,starts_at,ends_at,expires_at,granted_by,is_active,cohort_id)
    select p_tenant_id,p_program_id,btrim(full_name),phone_number,public.normalize_phone_digits(phone_number),p_starts_at,p_ends_at,p_expires_at,p_actor_id,true,p_cohort_id
    from jsonb_to_recordset(p_rows) as r(full_name text,phone_number text);
  get diagnostics inserted=row_count;
  return inserted;
end $$;
revoke all on function public.register_assigned_program_roster(uuid,uuid,uuid,jsonb,timestamptz,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.register_assigned_program_roster(uuid,uuid,uuid,jsonb,timestamptz,timestamptz,timestamptz,uuid) to service_role;


create or replace function public.apply_entitlement_auto_grants_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone_digits text;
  v_grant public.entitlement_auto_grants%rowtype;
  v_existing_entitlement_id uuid;
  v_existing_cohort_id uuid;
begin
  v_phone_digits := public.normalize_phone_digits(new.phone_number);

  if v_phone_digits = '' then
    return new;
  end if;

  for v_grant in
    select *
    from public.entitlement_auto_grants
    where tenant_id = new.tenant_id
      and phone_number_digits = v_phone_digits
      and is_active = true
      and ends_at >= now()
      and (matched_user_id is null or matched_user_id = new.user_id)
      and (expires_at is null or expires_at >= now())
  loop
    insert into public.tenant_memberships (tenant_id, user_id, role)
    values (new.tenant_id, new.user_id, 'member')
    on conflict (tenant_id, user_id) do nothing;

    select pe.id, pe.cohort_id
    into v_existing_entitlement_id, v_existing_cohort_id
    from public.program_entitlements pe
    where pe.tenant_id = new.tenant_id
      and pe.user_id = new.user_id
      and pe.program_id = v_grant.program_id
      and pe.is_active = true
      and (pe.ends_at is null or pe.ends_at >= now())
    order by pe.created_at desc
    limit 1;

    -- Never mark a different active cohort as successfully linked.
    if v_existing_entitlement_id is not null and v_grant.cohort_id is not null
      and v_existing_cohort_id is distinct from v_grant.cohort_id then
      continue;
    end if;
    if v_existing_entitlement_id is null then
      update public.program_entitlements set is_active=false
        where tenant_id=new.tenant_id and user_id=new.user_id and program_id=v_grant.program_id
          and is_active and ends_at<now();
      insert into public.program_entitlements (
        tenant_id,
        user_id,
        program_id,
        source_order_id,
        source_invitation_id,
        source_granted_by,
        cohort_id,
        starts_at,
        ends_at,
        is_active
      )
      values (
        new.tenant_id,
        new.user_id,
        v_grant.program_id,
        null,
        null,
        v_grant.granted_by,
        v_grant.cohort_id,
        v_grant.starts_at,
        v_grant.ends_at,
        true
      );
    end if;

    insert into public.user_program_states (tenant_id, user_id, active_program_id)
    values (new.tenant_id, new.user_id, v_grant.program_id)
    on conflict (tenant_id, user_id) do update
    set active_program_id = excluded.active_program_id;

    update public.entitlement_auto_grants
    set
      matched_user_id = new.user_id,
      matched_at = coalesce(matched_at, now())
    where id = v_grant.id;
  end loop;

  return new;
end;
$$;

create function public.create_assigned_program_cohort(p_tenant_id uuid,p_program_id uuid,p_actor_id uuid,p_name text,p_starts_on date)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare result uuid;
begin
  perform 1 from public.programs where id=p_program_id and tenant_id=p_tenant_id and delivery_mode='cohort_based' for share;
  if not found then raise exception '기수제 프로그램을 선택해 주세요.'; end if;
  if not public.can_manage_assigned_program(p_tenant_id,p_program_id,p_actor_id) then
    raise exception '담당 프로그램의 기수만 만들 수 있습니다.' using errcode='42501';
  end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 100 or p_starts_on is null then
    raise exception '기수 이름과 시작일을 입력해 주세요.';
  end if;
  insert into public.program_cohorts(tenant_id,program_id,name,starts_on,is_default)
    values(p_tenant_id,p_program_id,btrim(p_name),p_starts_on,false) returning id into result;
  return result;
end $$;
revoke all on function public.create_assigned_program_cohort(uuid,uuid,uuid,text,date) from public,anon,authenticated;
grant execute on function public.create_assigned_program_cohort(uuid,uuid,uuid,text,date) to service_role;
