create index if not exists idx_program_entitlements_active_tenant_program
on public.program_entitlements (tenant_id, program_id, user_id)
include (starts_at, ends_at, cohort_id)
where is_active = true;

create or replace function public.get_admin_active_program_mission_participation(
  p_tenant_id uuid,
  p_program_ids uuid[] default null
)
returns table (
  program_id uuid,
  program_title text,
  active_member_count bigint,
  mission_count bigint,
  expected_count bigint,
  participated_count bigint,
  participation_rate integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with active_programs as (
    select
      p.id,
      p.title,
      p.display_order,
      p.delivery_mode,
      p.content_starts_on
    from public.programs p
    where p.tenant_id = p_tenant_id
      and public.is_tenant_content_manager(p_tenant_id)
      and p.start_date <= (timezone('Asia/Seoul', now()))::date
      and p.end_date >= (timezone('Asia/Seoul', now()))::date
      and (p_program_ids is null or p.id = any(p_program_ids))
  ),
  active_entitlements as (
    select
      e.program_id,
      e.user_id,
      e.starts_at,
      e.ends_at,
      c.starts_on as cohort_starts_on
    from public.program_entitlements e
    join active_programs p on p.id = e.program_id
    left join public.program_cohorts c on c.id = e.cohort_id
    where e.tenant_id = p_tenant_id
      and e.is_active = true
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at >= now())
  ),
  mission_pairs as (
    select
      e.program_id,
      e.user_id,
      s.id as session_id,
      case
        when p.delivery_mode = 'cohort_based'
          and p.content_starts_on is not null
          and e.cohort_starts_on is not null
        then e.cohort_starts_on + (s.session_date - p.content_starts_on)
        else s.session_date
      end as mission_date,
      (e.starts_at at time zone 'Asia/Seoul')::date as access_starts_on,
      (e.ends_at at time zone 'Asia/Seoul')::date as access_ends_on
    from active_entitlements e
    join active_programs p on p.id = e.program_id
    join public.sessions s
      on s.program_id = e.program_id
     and s.tenant_id = p_tenant_id
     and s.is_published = true
     and s.session_type <> 'rest'
  ),
  eligible_pairs as (
    select mp.program_id, mp.user_id, mp.session_id
    from mission_pairs mp
    where mp.mission_date <= (timezone('Asia/Seoul', now()))::date
      and mp.mission_date >= mp.access_starts_on
      and (mp.access_ends_on is null or mp.mission_date <= mp.access_ends_on)
  ),
  member_counts as (
    select ae.program_id, count(*)::bigint as active_member_count
    from active_entitlements ae
    group by ae.program_id
  ),
  participation as (
    select
      ep.program_id,
      count(distinct ep.session_id)::bigint as mission_count,
      count(*)::bigint as expected_count,
      count(r.id)::bigint as participated_count
    from eligible_pairs ep
    left join public.program_session_reviews r
      on r.tenant_id = p_tenant_id
     and r.program_id = ep.program_id
     and r.session_id = ep.session_id
     and r.user_id = ep.user_id
    group by ep.program_id
  )
  select
    p.id as program_id,
    p.title as program_title,
    coalesce(mc.active_member_count, 0)::bigint as active_member_count,
    coalesce(pt.mission_count, 0)::bigint as mission_count,
    coalesce(pt.expected_count, 0)::bigint as expected_count,
    coalesce(pt.participated_count, 0)::bigint as participated_count,
    case
      when coalesce(pt.expected_count, 0) > 0
      then round(pt.participated_count::numeric * 100 / pt.expected_count)::integer
      else 0
    end as participation_rate
  from active_programs p
  left join member_counts mc on mc.program_id = p.id
  left join participation pt on pt.program_id = p.id
  order by p.display_order asc, p.title asc;
$$;

revoke all on function public.get_admin_active_program_mission_participation(uuid, uuid[]) from public;
revoke all on function public.get_admin_active_program_mission_participation(uuid, uuid[]) from anon;
grant execute on function public.get_admin_active_program_mission_participation(uuid, uuid[]) to authenticated;
