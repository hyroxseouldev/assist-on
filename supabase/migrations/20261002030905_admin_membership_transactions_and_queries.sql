-- Server-only RPCs. Mutation functions are invoker; only the private read functions
-- need definer rights to join protected auth.users. No broad auth.users grant.
create schema if not exists admin_private;
revoke all on schema admin_private from public, anon, authenticated;
grant usage on schema admin_private to service_role;
create table public.membership_admin_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id uuid references public.program_entitlements(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  action text not null check (action in ('revoke', 'end_date')),
  reason text not null default '' check (length(reason) <= 500),
  changed_by uuid not null references auth.users(id) on delete restrict,
  previous_ends_at timestamptz,
  next_ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index membership_admin_events_tenant_user_created_idx on public.membership_admin_events(tenant_id, user_id, created_at desc);
create index membership_admin_events_entitlement_idx on public.membership_admin_events(entitlement_id);
create index membership_admin_events_program_idx on public.membership_admin_events(program_id);
create index membership_admin_events_actor_idx on public.membership_admin_events(changed_by);
alter table public.membership_admin_events enable row level security;
revoke all on public.membership_admin_events from public, anon, authenticated, service_role;
grant select, insert on public.membership_admin_events to service_role;

create or replace function public.check_admin_member_access(p_tenant_id uuid, p_actor_id uuid, p_dashboard boolean default false)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_actor_id is null or not (
    public.is_admin(p_actor_id) or exists (
      select 1 from public.tenant_memberships m where m.tenant_id = p_tenant_id and m.user_id = p_actor_id
      and (m.role = 'owner' or (p_dashboard and m.role in ('coach', 'manager')))
    )
  ) then raise exception '관리 권한이 없습니다.' using errcode = '42501'; end if;
end;
$$;
revoke all on function public.check_admin_member_access(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.check_admin_member_access(uuid, uuid, boolean) to service_role;

-- Called only after the same user's entitlements are locked. Never store a null program ID.
create or replace function public.reconcile_admin_program_state(p_tenant_id uuid, p_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare next_program uuid;
begin
  if not exists (select 1 from public.user_program_states s where s.tenant_id = p_tenant_id and s.user_id = p_user_id) then return; end if;
  if exists (
    select 1 from public.user_program_states s join public.program_entitlements e
      on e.tenant_id = s.tenant_id and e.user_id = s.user_id and e.program_id = s.active_program_id
    where s.tenant_id = p_tenant_id and s.user_id = p_user_id and e.is_active
      and e.starts_at <= now() and (e.ends_at is null or e.ends_at >= now())
  ) then return; end if;
  select e.program_id into next_program from public.program_entitlements e
  where e.tenant_id = p_tenant_id and e.user_id = p_user_id and e.is_active
    and e.starts_at <= now() and (e.ends_at is null or e.ends_at >= now())
  order by e.starts_at desc, e.created_at desc, e.id limit 1;
  if next_program is null then
    delete from public.user_program_states where tenant_id = p_tenant_id and user_id = p_user_id;
  else
    update public.user_program_states set active_program_id = next_program where tenant_id = p_tenant_id and user_id = p_user_id;
  end if;
end;
$$;
revoke all on function public.reconcile_admin_program_state(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reconcile_admin_program_state(uuid, uuid) to service_role;

create or replace function public.revoke_admin_memberships(
  p_tenant_id uuid, p_user_id uuid, p_actor_id uuid, p_reason text, p_program_id uuid default null
) returns integer language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  perform public.check_admin_member_access(p_tenant_id, p_actor_id);
  if p_user_id is null or nullif(btrim(p_reason), '') is null or length(p_reason) > 500 then
    raise exception '회원과 해제 사유(500자 이내)를 확인해 주세요.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_user_id::text, 0));
  perform 1 from public.program_entitlements where tenant_id = p_tenant_id and user_id = p_user_id order by id for update;
  with revoked as (
    update public.program_entitlements set is_active = false
    where tenant_id = p_tenant_id and user_id = p_user_id and is_active
      and (p_program_id is null or program_id = p_program_id)
    returning id, program_id, ends_at
  ) insert into public.membership_admin_events(tenant_id, user_id, entitlement_id, program_id, action, reason, changed_by, previous_ends_at, next_ends_at)
    select p_tenant_id, p_user_id, id, program_id, 'revoke', btrim(p_reason), p_actor_id, ends_at, ends_at from revoked;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception '해제할 활성 멤버십이 없습니다.'; end if;
  perform public.reconcile_admin_program_state(p_tenant_id, p_user_id);
  return affected;
end;
$$;
revoke all on function public.revoke_admin_memberships(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.revoke_admin_memberships(uuid, uuid, uuid, text, uuid) to service_role;

create or replace function public.update_admin_membership_end_date(
  p_tenant_id uuid, p_entitlement_id uuid, p_actor_id uuid, p_ends_at timestamptz
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare e public.program_entitlements%rowtype; target_user uuid; active boolean;
begin
  perform public.check_admin_member_access(p_tenant_id, p_actor_id);
  if p_ends_at is null or not isfinite(p_ends_at) then raise exception '종료일을 확인해 주세요.'; end if;
  select user_id into target_user from public.program_entitlements where tenant_id = p_tenant_id and id = p_entitlement_id;
  if target_user is null then raise exception '멤버십을 찾지 못했습니다.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || target_user::text, 0));
  perform 1 from public.program_entitlements where tenant_id = p_tenant_id and user_id = target_user order by id for update;
  select * into e from public.program_entitlements where tenant_id = p_tenant_id and id = p_entitlement_id;
  if not e.is_active then raise exception '비활성 권한은 종료일만으로 다시 활성화할 수 없습니다.'; end if;
  if p_ends_at < e.starts_at then raise exception '종료일은 시작일 이후여야 합니다.'; end if;
  active := p_ends_at >= now();
  update public.program_entitlements set ends_at = p_ends_at, is_active = active where id = e.id and tenant_id = p_tenant_id;
  insert into public.membership_admin_events(tenant_id, user_id, entitlement_id, program_id, action, changed_by, previous_ends_at, next_ends_at)
    values (p_tenant_id, e.user_id, e.id, e.program_id, 'end_date', p_actor_id, e.ends_at, p_ends_at);
  perform public.reconcile_admin_program_state(p_tenant_id, e.user_id);
  return active;
end;
$$;
revoke all on function public.update_admin_membership_end_date(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.update_admin_membership_end_date(uuid, uuid, uuid, timestamptz) to service_role;

create or replace function admin_private.get_admin_users_page(
  p_tenant_id uuid, p_actor_id uuid, p_query text default '', p_program_id uuid default null,
  p_role text default 'all', p_sort text default 'created_at', p_order text default 'desc', p_page integer default 1, p_page_size integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; size integer := greatest(1, least(coalesce(p_page_size, 20), 50));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception '인증 사용자와 요청자가 다릅니다.' using errcode = '42501';
  end if;
  perform public.check_admin_member_access(p_tenant_id, p_actor_id);
  if p_sort not in ('created_at', 'last_sign_in_at', 'full_name') or p_order not in ('asc', 'desc')
    or p_role not in ('all', 'owner', 'manager', 'coach', 'member', 'unregistered') then raise exception '잘못된 조회 조건입니다.'; end if;
  with candidates as (
    select user_id from public.tenant_user_profiles where tenant_id = p_tenant_id
    union select user_id from public.tenant_memberships where tenant_id = p_tenant_id
    union select user_id from public.program_entitlements where tenant_id = p_tenant_id
    union select user_id from public.user_program_states where tenant_id = p_tenant_id
    union select user_id from public.user_workout_records_v2 where tenant_id = p_tenant_id
  ), users as (
    select u.id, coalesce(u.email, '') as email,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), nullif(btrim(u.email), ''), '미등록 사용자') as full_name,
      nullif(btrim(p.phone_number), '') as phone_number,
      case when p.user_id is not null then p.avatar_url else u.raw_user_meta_data->>'avatar_url' end as avatar_url,
      p.gender, coalesce(p.tenant_status, 'active') as account_status, p.deactivated_at,
      coalesce(m.role, 'member') as role, m.user_id is not null as has_membership,
      u.email_confirmed_at is not null as email_confirmed, u.invited_at, u.last_sign_in_at, u.created_at,
      coalesce(p.hyrox_profile, '{}'::jsonb) as hyrox_profile
    from candidates c join auth.users u on u.id = c.user_id
    left join public.tenant_user_profiles p on p.tenant_id = p_tenant_id and p.user_id = u.id
    left join public.tenant_memberships m on m.tenant_id = p_tenant_id and m.user_id = u.id
  ), filtered as materialized (
    select * from users u where
      (p_role = 'all' or (p_role = 'unregistered' and not has_membership) or (has_membership and role = p_role))
      and (p_program_id is null or exists (select 1 from public.program_entitlements e where e.tenant_id = p_tenant_id and e.user_id = u.id and e.program_id = p_program_id))
      and (nullif(btrim(p_query), '') is null or strpos(lower(full_name || ' ' || email || ' ' || coalesce(phone_number, '')), lower(btrim(p_query))) > 0
        or (regexp_replace(p_query, '[^0-9]', '', 'g') <> '' and strpos(regexp_replace(coalesce(phone_number, ''), '[^0-9]', '', 'g'), regexp_replace(p_query, '[^0-9]', '', 'g')) > 0))
  ), totals as (
    select count(*) as total, greatest(1, ceil(count(*)::numeric / size)::integer) as pages from filtered
  ), bounds as (
    select *, least(greatest(coalesce(p_page, 1), 1), pages) as page from totals
  ), paged as (
    select * from filtered order by
      case when p_sort = 'full_name' and p_order = 'asc' then full_name end asc,
      case when p_sort = 'full_name' and p_order = 'desc' then full_name end desc,
      case when p_sort = 'created_at' and p_order = 'asc' then created_at end asc,
      case when p_sort = 'created_at' and p_order = 'desc' then created_at end desc,
      case when p_sort = 'last_sign_in_at' and p_order = 'asc' then last_sign_in_at end asc nulls last,
      case when p_sort = 'last_sign_in_at' and p_order = 'desc' then last_sign_in_at end desc nulls last,
      id
    limit size offset (select (page - 1) * size from bounds)
  ), enriched as (
    select to_jsonb(u) || jsonb_build_object(
      'active_program_id', (select active_program_id from public.user_program_states s where s.tenant_id = p_tenant_id and s.user_id = u.id),
      'program_entitlements', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'program_id', e.program_id, 'program_title', coalesce(nullif(btrim(p.title), ''), '삭제된 프로그램'),
        'cohort_id', e.cohort_id, 'cohort_name', c.name, 'cohort_starts_on', c.starts_on,
        'starts_at', e.starts_at, 'ends_at', e.ends_at, 'is_active', e.is_active, 'created_at', e.created_at
      ) order by e.starts_at desc, e.created_at desc, e.id) from public.program_entitlements e
        left join public.programs p on p.id = e.program_id and p.tenant_id = e.tenant_id
        left join public.program_cohorts c on c.id = e.cohort_id and c.tenant_id = e.tenant_id
        where e.tenant_id = p_tenant_id and e.user_id = u.id), '[]'::jsonb),
      'program_change_history', coalesce((select jsonb_agg(to_jsonb(h) || jsonb_build_object(
        'from_program_title', coalesce(fp.title, '삭제된 프로그램'), 'to_program_title', coalesce(tp.title, '삭제된 프로그램'),
        'changed_by_name', coalesce(nullif(btrim(a.raw_user_meta_data->>'full_name'), ''), a.email, '관리자')
      ) order by h.created_at desc, h.id) from public.program_entitlement_change_history h
        left join public.programs fp on fp.id = h.from_program_id and fp.tenant_id = h.tenant_id
        left join public.programs tp on tp.id = h.to_program_id and tp.tenant_id = h.tenant_id
        left join auth.users a on a.id = h.changed_by
        where h.tenant_id = p_tenant_id and h.user_id = u.id), '[]'::jsonb),
      'membership_admin_events', coalesce((select jsonb_agg(to_jsonb(h) || jsonb_build_object(
        'program_title', coalesce(p.title, '삭제된 프로그램'),
        'changed_by_name', coalesce(nullif(btrim(a.raw_user_meta_data->>'full_name'), ''), a.email, '관리자')
      ) order by h.created_at desc, h.id) from public.membership_admin_events h
        left join public.programs p on p.id = h.program_id and p.tenant_id = h.tenant_id
        left join auth.users a on a.id = h.changed_by
        where h.tenant_id = p_tenant_id and h.user_id = u.id), '[]'::jsonb)
    ) as item from paged u
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(item) from enriched), '[]'::jsonb),
    'total', total, 'page', page, 'pageSize', size, 'totalPages', pages) into result from bounds;
  return result;
end;
$$;
revoke all on function admin_private.get_admin_users_page(uuid, uuid, text, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function admin_private.get_admin_users_page(uuid, uuid, text, uuid, text, text, text, integer, integer) to service_role;

create or replace function public.get_admin_users_page(p_tenant_id uuid, p_actor_id uuid, p_query text default '', p_program_id uuid default null, p_role text default 'all', p_sort text default 'created_at', p_order text default 'desc', p_page integer default 1, p_page_size integer default 20)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select admin_private.get_admin_users_page(p_tenant_id, p_actor_id, p_query, p_program_id, p_role, p_sort, p_order, p_page, p_page_size);
$$;
revoke all on function public.get_admin_users_page(uuid, uuid, text, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_admin_users_page(uuid, uuid, text, uuid, text, text, text, integer, integer) to service_role;

create or replace function admin_private.get_admin_memberships_page(
  p_tenant_id uuid, p_actor_id uuid, p_query text default '', p_program_id uuid default null,
  p_status text default 'all', p_page integer default 1, p_page_size integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; size integer := greatest(1, least(coalesce(p_page_size, 20), 50));
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception '인증 사용자와 요청자가 다릅니다.' using errcode = '42501';
  end if;
  perform public.check_admin_member_access(p_tenant_id, p_actor_id);
  if p_status not in ('all', 'active', 'pending', 'expired', 'inactive') then raise exception '잘못된 상태입니다.'; end if;
  with memberships as (
    select e.id, e.user_id, e.program_id, e.cohort_id, e.starts_at, e.ends_at, e.is_active, e.created_at,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), u.email, '회원') as user_name,
      coalesce(u.email, '') as user_email, nullif(btrim(p.phone_number), '') as user_phone_number,
      coalesce(nullif(btrim(pr.title), ''), '삭제된 프로그램') as program_title, c.name as cohort_name, c.starts_on as cohort_starts_on,
      coalesce(s.active_program_id = e.program_id, false) as is_current_program,
      case when not e.is_active then 'inactive' when e.starts_at > now() then 'pending'
        when e.ends_at is null or e.ends_at >= now() then 'active' else 'expired' end as status
    from public.program_entitlements e
    left join auth.users u on u.id = e.user_id
    left join public.tenant_user_profiles p on p.tenant_id = e.tenant_id and p.user_id = e.user_id
    left join public.programs pr on pr.tenant_id = e.tenant_id and pr.id = e.program_id
    left join public.program_cohorts c on c.tenant_id = e.tenant_id and c.id = e.cohort_id
    left join public.user_program_states s on s.tenant_id = e.tenant_id and s.user_id = e.user_id
    where e.tenant_id = p_tenant_id and (p_program_id is null or e.program_id = p_program_id)
  ), filtered as materialized (
    select * from memberships where (p_status = 'all' or status = p_status)
      and (nullif(btrim(p_query), '') is null or strpos(lower(user_name || ' ' || user_email || ' ' || coalesce(user_phone_number, '')), lower(btrim(p_query))) > 0
        or (regexp_replace(p_query, '[^0-9]', '', 'g') <> '' and strpos(regexp_replace(coalesce(user_phone_number, ''), '[^0-9]', '', 'g'), regexp_replace(p_query, '[^0-9]', '', 'g')) > 0))
  ), totals as (
    select count(*) as total, greatest(1, ceil(count(*)::numeric / size)::integer) as pages from filtered
  ), bounds as (
    select *, least(greatest(coalesce(p_page, 1), 1), pages) as page from totals
  ), paged as (
    select * from filtered order by starts_at desc, created_at desc, id limit size offset (select (page - 1) * size from bounds)
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p)) from paged p), '[]'::jsonb),
    'total', total, 'page', page, 'pageSize', size, 'totalPages', pages) into result from bounds;
  return result;
end;
$$;
revoke all on function admin_private.get_admin_memberships_page(uuid, uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function admin_private.get_admin_memberships_page(uuid, uuid, text, uuid, text, integer, integer) to service_role;

create or replace function public.get_admin_memberships_page(p_tenant_id uuid, p_actor_id uuid, p_query text default '', p_program_id uuid default null, p_status text default 'all', p_page integer default 1, p_page_size integer default 20)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select admin_private.get_admin_memberships_page(p_tenant_id, p_actor_id, p_query, p_program_id, p_status, p_page, p_page_size);
$$;
revoke all on function public.get_admin_memberships_page(uuid, uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_admin_memberships_page(uuid, uuid, text, uuid, text, integer, integer) to service_role;

create or replace function admin_private.get_admin_signup_counts(p_tenant_id uuid, p_actor_id uuid)
returns table(day text, count bigint) language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and auth.uid() <> p_actor_id then
    raise exception '인증 사용자와 요청자가 다릅니다.' using errcode = '42501';
  end if;
  perform public.check_admin_member_access(p_tenant_id, p_actor_id, true);
  return query select to_char(u.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD'), count(*)
    from auth.users u join public.tenant_memberships m on m.user_id = u.id and m.tenant_id = p_tenant_id
    where u.created_at >= ((now() at time zone 'Asia/Seoul')::date - 6)::timestamp at time zone 'Asia/Seoul'
      and u.created_at < ((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul'
    group by 1;
end;
$$;
revoke all on function admin_private.get_admin_signup_counts(uuid, uuid) from public, anon, authenticated;
grant execute on function admin_private.get_admin_signup_counts(uuid, uuid) to service_role;

create or replace function public.get_admin_signup_counts(p_tenant_id uuid, p_actor_id uuid)
returns table(day text, count bigint) language sql stable security invoker set search_path = '' as $$
  select * from admin_private.get_admin_signup_counts(p_tenant_id, p_actor_id);
$$;
revoke all on function public.get_admin_signup_counts(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_admin_signup_counts(uuid, uuid) to service_role;
