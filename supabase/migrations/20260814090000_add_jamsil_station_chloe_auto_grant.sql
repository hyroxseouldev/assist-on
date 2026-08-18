with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  target_program as (
    select p.id
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title = 'XON JAMSIL | 12주 HYROX 프로그램 | 스테이션'
    limit 1
  ),
  grantor as (
    select tm.user_id
    from public.tenant_memberships tm
    join target_tenant t on t.id = tm.tenant_id
    where tm.role = 'owner'
    order by tm.created_at asc
    limit 1
  ),
  applicant(full_name, phone_number, team_name) as (
    values ('클로이(홍성희)', '010-3236-8217', '스테이션')
  )
insert into public.entitlement_auto_grants (
  tenant_id,
  program_id,
  full_name,
  team_name,
  phone_number,
  phone_number_digits,
  starts_at,
  ends_at,
  expires_at,
  granted_by,
  is_active
)
select
  t.id,
  p.id,
  a.full_name,
  a.team_name,
  a.phone_number,
  public.normalize_phone_digits(a.phone_number),
  '2026-08-16 15:00:00+00'::timestamptz,
  '2026-11-15 14:59:59.999+00'::timestamptz,
  now() + interval '14 days',
  g.user_id,
  true
from applicant a
cross join target_tenant t
cross join target_program p
cross join grantor g
on conflict (tenant_id, phone_number_digits, program_id) do update
set
  full_name = excluded.full_name,
  team_name = excluded.team_name,
  phone_number = excluded.phone_number,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  expires_at = excluded.expires_at,
  granted_by = excluded.granted_by,
  is_active = true;

update public.tenant_user_profiles tup
set phone_number = tup.phone_number
from public.entitlement_auto_grants eag
where tup.tenant_id = eag.tenant_id
  and public.normalize_phone_digits(tup.phone_number) = eag.phone_number_digits
  and eag.phone_number_digits = public.normalize_phone_digits('010-3236-8217')
  and eag.is_active = true;
