-- Match the tenant_membership_role enum to the text search parameter.
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
      coalesce(m.role::text, 'member') as role, m.user_id is not null as has_membership,
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

