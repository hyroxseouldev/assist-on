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
    ) and (
      (p_program_id is null and not coalesce(p_active_only, false))
      or exists (
        select 1 from public.program_entitlements e
        where e.tenant_id = p_tenant_id and e.user_id = m.id
          and (p_program_id is null or e.program_id = p_program_id)
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
    select m.*, s.active_program_id,
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
