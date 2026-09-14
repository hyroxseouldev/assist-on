-- Manager assignments are independent of mobile-facing coach profiles.
create table public.program_managers (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  manager_user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (program_id, manager_user_id),
  foreign key (tenant_id, manager_user_id)
    references public.tenant_memberships(tenant_id, user_id) on delete cascade
);
create index program_managers_tenant_user_idx on public.program_managers(tenant_id, manager_user_id);
alter table public.program_managers enable row level security;
revoke all on public.program_managers from public, anon, authenticated;
grant select on public.program_managers to authenticated;
grant all on public.program_managers to service_role;
create policy program_managers_read on public.program_managers for select to authenticated
using (public.is_admin((select auth.uid())) or public.is_tenant_owner(tenant_id, (select auth.uid())) or manager_user_id=(select auth.uid()));

create function public.validate_program_manager() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from public.programs where id=new.program_id and tenant_id=new.tenant_id)
    or not exists(select 1 from public.tenant_memberships where tenant_id=new.tenant_id and user_id=new.manager_user_id and role::text='manager') then
    raise exception '같은 테넌트의 프로그램과 매니저만 연결할 수 있습니다.';
  end if;
  return new;
end $$;
revoke all on function public.validate_program_manager() from public,anon,authenticated;
create trigger program_managers_validate before insert or update on public.program_managers
for each row execute function public.validate_program_manager();

-- Server-only helper; caller identity is supplied by authenticated server actions.
create function public.can_manage_assigned_program(p_tenant_id uuid,p_program_id uuid,p_actor_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
select exists(select 1 from public.programs where id=p_program_id and tenant_id=p_tenant_id)
  and (coalesce(public.is_admin(p_actor_id),false) or public.is_tenant_owner(p_tenant_id,p_actor_id)
    or exists(select 1 from public.program_managers pm join public.tenant_memberships tm
      on tm.tenant_id=pm.tenant_id and tm.user_id=pm.manager_user_id
      where pm.tenant_id=p_tenant_id and pm.program_id=p_program_id and pm.manager_user_id=p_actor_id and tm.role::text='manager'));
$$;
revoke all on function public.can_manage_assigned_program(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_manage_assigned_program(uuid,uuid,uuid) to service_role;

create function public.set_program_managers(p_tenant_id uuid,p_program_id uuid,p_actor_id uuid,p_manager_ids uuid[])
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if not (coalesce(public.is_admin(p_actor_id),false) or public.is_tenant_owner(p_tenant_id,p_actor_id)) then
    raise exception '담당 매니저 지정은 오너만 변경할 수 있습니다.' using errcode='42501';
  end if;
  perform 1 from public.programs where id=p_program_id and tenant_id=p_tenant_id for update;
  if not found then raise exception '프로그램을 찾을 수 없습니다.'; end if;
  if exists(select 1 from unnest(coalesce(p_manager_ids,'{}'::uuid[])) u(id)
    where not exists(select 1 from public.tenant_memberships where tenant_id=p_tenant_id and user_id=u.id and role::text='manager')) then
    raise exception '같은 테넌트의 매니저를 선택해 주세요.';
  end if;
  delete from public.program_managers where tenant_id=p_tenant_id and program_id=p_program_id;
  insert into public.program_managers(tenant_id,program_id,manager_user_id)
    select p_tenant_id,p_program_id,id from (select distinct unnest(coalesce(p_manager_ids,'{}'::uuid[])) as id) selected;
end $$;
revoke all on function public.set_program_managers(uuid,uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.set_program_managers(uuid,uuid,uuid,uuid[]) to service_role;

create function public.register_assigned_program_roster(p_tenant_id uuid,p_program_id uuid,p_actor_id uuid,
  p_rows jsonb,p_starts_at timestamptz,p_ends_at timestamptz,p_expires_at timestamptz)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare inserted integer;
begin
  perform 1 from public.programs where tenant_id=p_tenant_id and id=p_program_id and delivery_mode='fixed_date' for share;
  if not found then raise exception '날짜 고정형 프로그램을 선택해 주세요.'; end if;
  if not public.can_manage_assigned_program(p_tenant_id,p_program_id,p_actor_id) then
    raise exception '담당 프로그램만 사전등록할 수 있습니다.' using errcode='42501';
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
  insert into public.entitlement_auto_grants(tenant_id,program_id,full_name,phone_number,phone_number_digits,starts_at,ends_at,expires_at,granted_by,is_active)
    select p_tenant_id,p_program_id,btrim(full_name),phone_number,public.normalize_phone_digits(phone_number),p_starts_at,p_ends_at,p_expires_at,p_actor_id,true
    from jsonb_to_recordset(p_rows) as r(full_name text,phone_number text);
  get diagnostics inserted=row_count;
  return inserted;
end $$;
revoke all on function public.register_assigned_program_roster(uuid,uuid,uuid,jsonb,timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.register_assigned_program_roster(uuid,uuid,uuid,jsonb,timestamptz,timestamptz,timestamptz) to service_role;

create function public.stop_assigned_program_roster(p_tenant_id uuid,p_grant_id uuid,p_actor_id uuid)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare target_program uuid;
begin
  select program_id into target_program from public.entitlement_auto_grants where tenant_id=p_tenant_id and id=p_grant_id and is_active for update;
  if target_program is null then raise exception '이미 중지되었거나 명단을 찾을 수 없습니다.'; end if;
  perform 1 from public.programs where id=target_program and tenant_id=p_tenant_id for share;
  if not public.can_manage_assigned_program(p_tenant_id,target_program,p_actor_id) then
    raise exception '담당 프로그램만 중지할 수 있습니다.' using errcode='42501';
  end if;
  update public.entitlement_auto_grants set is_active=false where id=p_grant_id and tenant_id=p_tenant_id;
end $$;
revoke all on function public.stop_assigned_program_roster(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.stop_assigned_program_roster(uuid,uuid,uuid) to service_role;

-- Server-only tenant search: filter/page before loading entitlement and history details.
create or replace function public.search_program_change_members(
  p_tenant_id uuid, p_actor_id uuid, p_query text default '',
  p_program_id uuid default null, p_active_only boolean default false,
  p_page integer default 1, p_page_size integer default 10
)
returns jsonb
language plpgsql stable security invoker
set search_path = public, pg_temp
as $$
declare
  search_query text := lower(btrim(coalesce(p_query, '')));
  phone_query text;
  page_size integer := least(50, greatest(1, coalesce(p_page_size, 10)));
  requested_page integer := greatest(1, coalesce(p_page, 1));
  result jsonb;
  scoped boolean;
  assigned_ids uuid[];
begin
  if not (
    coalesce(public.is_admin(p_actor_id), false)
    or exists (
      select 1 from public.tenant_memberships
      where tenant_id = p_tenant_id and user_id = p_actor_id
        and role::text in ('owner', 'manager')
    )
  ) then
    raise exception '회원 검색 권한이 없습니다.' using errcode = '42501';
  end if;

  scoped := not (coalesce(public.is_admin(p_actor_id),false) or public.is_tenant_owner(p_tenant_id,p_actor_id));
  select coalesce(array_agg(program_id),'{}'::uuid[]) into assigned_ids
    from public.program_managers where tenant_id=p_tenant_id and manager_user_id=p_actor_id;

  -- Numeric phone fragments support formatting; letters must not match unrelated phones.
  phone_query := case when search_query ~ '^[+0-9()[:space:].-]+$'
    then regexp_replace(search_query, '[^0-9]', '', 'g') else '' end;

  with candidate_ids as (
    select user_id from public.tenant_user_profiles where tenant_id = p_tenant_id
    union
    select user_id from public.tenant_memberships where tenant_id = p_tenant_id
    union
    select user_id from public.program_entitlements where tenant_id = p_tenant_id
    union
    select user_id from public.user_program_states where tenant_id = p_tenant_id
    union
    select user_id from public.user_workout_records_v2 where tenant_id = p_tenant_id
  ), members as (
    select u.id, coalesce(u.email, '') as email,
      coalesce(nullif(btrim(tp.display_name), ''),
        nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
        nullif(btrim(u.email), ''), '미등록 사용자') as full_name,
      nullif(btrim(tp.phone_number), '') as phone_number,
      tp.gender, coalesce(tp.tenant_status, 'active') as account_status,
      tp.deactivated_at, coalesce(tm.role::text, 'member') as role,
      tm.user_id is not null as has_membership,
      u.email_confirmed_at is not null as email_confirmed,
      u.invited_at, u.last_sign_in_at, u.created_at
    from candidate_ids c
    join auth.users u on u.id = c.user_id and u.deleted_at is null
    left join public.tenant_user_profiles tp on tp.tenant_id = p_tenant_id and tp.user_id = u.id
    left join public.tenant_memberships tm on tm.tenant_id = p_tenant_id and tm.user_id = u.id
  ), filtered as materialized (
    select m.* from members m
    where (
      search_query = ''
      or strpos(lower(m.full_name || ' ' || m.email || ' ' || coalesce(m.phone_number, '')), search_query) > 0
      or (phone_query <> '' and strpos(regexp_replace(coalesce(m.phone_number, ''), '[^0-9]', '', 'g'), phone_query) > 0)
    ) and (not scoped or exists (
      select 1 from public.program_entitlements visible
      where visible.tenant_id=p_tenant_id and visible.user_id=m.id and visible.program_id=any(assigned_ids)
    )) and (
      (p_program_id is null and not coalesce(p_active_only, false))
      or exists (
        select 1 from public.program_entitlements e
        where e.tenant_id = p_tenant_id and e.user_id = m.id
          and (p_program_id is null or e.program_id = p_program_id)
          and (not scoped or e.program_id=any(assigned_ids))
          and (not coalesce(p_active_only, false) or (
            e.is_active and e.starts_at <= now()
            and (e.ends_at is null or e.ends_at >= now())
          ))
      )
    )
  ), totals as (
    select count(*) as total,
      greatest(1, ceil(count(*)::numeric / page_size)::integer) as total_pages from filtered
  ), page_members as (
    select * from filtered order by full_name collate "ko-KR-x-icu", id
    limit page_size
    offset (least(requested_page, (select total_pages from totals)) - 1)::bigint * page_size
  ), detailed as (
    select m.*, case when not scoped or s.active_program_id=any(assigned_ids) then s.active_program_id else null end as active_program_id,
      coalesce(entitlements.items, '[]'::jsonb) as program_entitlements,
      coalesce(history.items, '[]'::jsonb) as program_change_history,
      '{}'::jsonb as hyrox_profile
    from page_members m
    left join public.user_program_states s on s.tenant_id = p_tenant_id and s.user_id = m.id
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'program_id', e.program_id,
        'program_title', coalesce(nullif(btrim(p.title), ''), '삭제된 프로그램'),
        'cohort_id', e.cohort_id, 'cohort_name', c.name, 'cohort_starts_on', c.starts_on,
        'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'is_active', e.is_active, 'created_at', e.created_at
      ) order by e.starts_at desc, e.created_at desc, e.id) as items
      from public.program_entitlements e
      left join public.programs p on p.id = e.program_id and p.tenant_id = p_tenant_id
      left join public.program_cohorts c on c.id = e.cohort_id and c.tenant_id = p_tenant_id
      where e.tenant_id = p_tenant_id and e.user_id = m.id
        and (not scoped or e.program_id=any(assigned_ids))
    ) entitlements on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'from_program_id', h.from_program_id, 'to_program_id', h.to_program_id,
        'from_program_title', coalesce(nullif(btrim(fp.title), ''), '삭제된 프로그램'),
        'to_program_title', coalesce(nullif(btrim(tp.title), ''), '삭제된 프로그램'),
        'changed_by', h.changed_by,
        'changed_by_name', coalesce(nullif(btrim(actor.raw_user_meta_data->>'full_name'), ''), nullif(btrim(actor.email), ''), '관리자'),
        'previous_ends_at', h.previous_ends_at, 'next_starts_at', h.next_starts_at,
        'next_ends_at', h.next_ends_at, 'created_at', h.created_at
      ) order by h.created_at desc, h.id) as items
      from public.program_entitlement_change_history h
      left join public.programs fp on fp.id = h.from_program_id and fp.tenant_id = p_tenant_id
      left join public.programs tp on tp.id = h.to_program_id and tp.tenant_id = p_tenant_id
      left join auth.users actor on actor.id = h.changed_by
      where h.tenant_id = p_tenant_id and h.user_id = m.id
        and (not scoped or (h.from_program_id=any(assigned_ids) and h.to_program_id=any(assigned_ids)))
    ) history on true
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(d) order by d.full_name collate "ko-KR-x-icu", d.id) from detailed d), '[]'::jsonb),
    'total', total, 'page', least(requested_page, total_pages),
    'pageSize', page_size, 'totalPages', total_pages,
    'nowTimestamp', floor(extract(epoch from now()) * 1000)
  ) into result from totals;
  return result;
end;
$$;
revoke all on function public.search_program_change_members(uuid, uuid, text, uuid, boolean, integer, integer) from public, anon, authenticated;
grant execute on function public.search_program_change_members(uuid, uuid, text, uuid, boolean, integer, integer) to service_role;

create or replace function public.change_member_program_entitlement(
  p_tenant_id uuid,
  p_user_id uuid,
  p_from_entitlement_id uuid,
  p_to_program_id uuid,
  p_to_cohort_id uuid,
  p_changed_by uuid
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  source_entitlement public.program_entitlements%rowtype;
  target_delivery_mode text;
  target_entitlement_id uuid;
  history_id uuid;
  changed_at timestamptz := now();
begin
  if not (
    public.is_admin(p_changed_by)
    or public.is_tenant_owner(p_tenant_id, p_changed_by)
    or exists (
      select 1 from public.tenant_memberships
      where tenant_id = p_tenant_id and user_id = p_changed_by and role::text = 'manager'
    )
  ) then
    raise exception '프로그램 변경은 오너 또는 매니저 권한이 필요합니다.';
  end if;

  select entitlement.*
    into strict source_entitlement
  from public.program_entitlements as entitlement
  where entitlement.id = p_from_entitlement_id
    and entitlement.tenant_id = p_tenant_id
    and entitlement.user_id = p_user_id
    and entitlement.is_active = true
    and (entitlement.ends_at is null or entitlement.ends_at >= changed_at)
  for update;

  -- Lock both programs in stable order to serialize assignment changes.
  perform 1 from public.programs where tenant_id=p_tenant_id
    and id in (source_entitlement.program_id,p_to_program_id) order by id for share;
  if not public.can_manage_assigned_program(p_tenant_id,source_entitlement.program_id,p_changed_by)
    or not public.can_manage_assigned_program(p_tenant_id,p_to_program_id,p_changed_by) then
    raise exception '담당 프로그램 사이에서만 변경할 수 있습니다.' using errcode='42501';
  end if;

  if source_entitlement.program_id = p_to_program_id then
    raise exception '현재 프로그램과 다른 프로그램을 선택해 주세요.';
  end if;

  select program.delivery_mode
    into strict target_delivery_mode
  from public.programs as program
  where program.id = p_to_program_id
    and program.tenant_id = p_tenant_id;

  if exists (
    select 1
    from public.program_entitlements as entitlement
    where entitlement.tenant_id = p_tenant_id
      and entitlement.user_id = p_user_id
      and entitlement.program_id = p_to_program_id
      and entitlement.is_active = true
      and (entitlement.ends_at is null or entitlement.ends_at >= changed_at)
  ) then
    raise exception '이미 활성화된 대상 프로그램 권한이 있습니다.';
  end if;

  if target_delivery_mode = 'cohort_based' then
    if p_to_cohort_id is null or not exists (
      select 1
      from public.program_cohorts as cohort
      where cohort.id = p_to_cohort_id
        and cohort.tenant_id = p_tenant_id
        and cohort.program_id = p_to_program_id
    ) then
      raise exception '대상 프로그램의 유효한 기수를 선택해 주세요.';
    end if;
  end if;

  update public.program_entitlements
  set is_active = false
  where id = source_entitlement.id;

  insert into public.program_entitlements (
    tenant_id,
    user_id,
    program_id,
    source_granted_by,
    cohort_id,
    starts_at,
    ends_at,
    is_active
  )
  values (
    p_tenant_id,
    p_user_id,
    p_to_program_id,
    p_changed_by,
    case when target_delivery_mode = 'cohort_based' then p_to_cohort_id else null end,
    changed_at,
    source_entitlement.ends_at,
    true
  )
  returning id into target_entitlement_id;

  insert into public.user_program_states (tenant_id, user_id, active_program_id)
  values (p_tenant_id, p_user_id, p_to_program_id)
  on conflict (tenant_id, user_id)
  do update set active_program_id = excluded.active_program_id;

  insert into public.program_entitlement_change_history (
    tenant_id,
    user_id,
    from_entitlement_id,
    to_entitlement_id,
    from_program_id,
    to_program_id,
    from_cohort_id,
    to_cohort_id,
    changed_by,
    previous_starts_at,
    previous_ends_at,
    next_starts_at,
    next_ends_at,
    created_at
  )
  values (
    p_tenant_id,
    p_user_id,
    source_entitlement.id,
    target_entitlement_id,
    source_entitlement.program_id,
    p_to_program_id,
    source_entitlement.cohort_id,
    case when target_delivery_mode = 'cohort_based' then p_to_cohort_id else null end,
    p_changed_by,
    source_entitlement.starts_at,
    source_entitlement.ends_at,
    changed_at,
    source_entitlement.ends_at,
    changed_at
  )
  returning id into history_id;

  return history_id;
exception
  when no_data_found then
    raise exception '변경할 활성 권한 또는 대상 프로그램을 찾지 못했습니다.';
end;
$$;

revoke all on function public.change_member_program_entitlement(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.change_member_program_entitlement(uuid, uuid, uuid, uuid, uuid, uuid) to service_role;
