-- The server-only search remains SECURITY INVOKER. Grant only the Auth
-- metadata columns it actually reads, never passwords/tokens or client-role access.
grant select (id, email, raw_user_meta_data, email_confirmed_at, invited_at,
  last_sign_in_at, created_at, deleted_at) on auth.users to service_role;

-- Read-only dashboard access for tenant managers; coach program scope is unchanged.
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
security definer
set search_path = public, pg_temp
as $$
  with caller_access as (
    select
      auth.uid() as user_id,
      public.is_admin(auth.uid()) as is_platform_admin,
      exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = p_tenant_id
          and tm.user_id = auth.uid()
          and tm.role::text in ('owner', 'manager')
      ) as can_view_all_programs,
      (
        public.is_tenant_content_manager(p_tenant_id)
        or exists (
          select 1 from public.tenant_memberships tm
          where tm.tenant_id = p_tenant_id and tm.user_id = auth.uid()
            and tm.role::text = 'manager'
        )
      ) as can_view_dashboard
  ),
  active_programs as (
    select
      p.id,
      p.title,
      p.display_order,
      p.delivery_mode,
      p.content_starts_on
    from public.programs p
    where p.tenant_id = p_tenant_id
      and p.mobile_visibility = 'public'
      and (select ca.can_view_dashboard from caller_access ca)
      and (
        (select ca.is_platform_admin or ca.can_view_all_programs from caller_access ca)
        or exists (
          select 1
          from public.program_coaches pc
          join public.coach_profiles cp on cp.id = pc.coach_profile_id
          where pc.program_id = p.id
            and cp.tenant_id = p_tenant_id
            and cp.user_id = (select ca.user_id from caller_access ca)
            and cp.is_active = true
        )
      )
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
