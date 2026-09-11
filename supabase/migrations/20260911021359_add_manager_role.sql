alter type public.tenant_membership_role add value if not exists 'manager';

-- Manager operations are authorized by server actions; coaches cannot access rosters directly.
alter policy "Tenant managers can read entitlement auto grants"
on public.entitlement_auto_grants
using (public.is_admin((select auth.uid())) or public.is_tenant_owner(tenant_id, (select auth.uid())));
alter policy "Tenant managers can manage entitlement auto grants"
on public.entitlement_auto_grants
using (public.is_admin((select auth.uid())) or public.is_tenant_owner(tenant_id, (select auth.uid())))
with check (public.is_admin((select auth.uid())) or public.is_tenant_owner(tenant_id, (select auth.uid())));

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
