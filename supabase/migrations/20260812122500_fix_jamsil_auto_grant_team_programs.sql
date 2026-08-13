with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  target_programs as (
    select
      p.id,
      case
        when p.title ilike '%러닝%' then '러닝'
        when p.title ilike '%스테이션%' then '스테이션'
      end as team_name
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title ilike '%JAMSIL%'
      and p.title ilike '%HYROX%'
      and (
        p.title ilike '%러닝%'
        or p.title ilike '%스테이션%'
      )
  ),
  grantor as (
    select tm.user_id
    from public.tenant_memberships tm
    join target_tenant t on t.id = tm.tenant_id
    where tm.role = 'owner'
    order by tm.created_at asc
    limit 1
  ),
  applicants(full_name, phone_number, team_name) as (
    values
      ('성소리', '010-4165-6614', '러닝'),
      ('이수민', '010-9641-1156', '러닝'),
      ('허지영', '010-7762-8744', '러닝'),
      ('엄옥연', '010-8994-7435', '러닝'),
      ('김대호', '010-9930-3771', '스테이션'),
      ('김진주', '010-8554-8603', '스테이션'),
      ('정다은', '010-6412-8292', '스테이션'),
      ('김소현', '010-3020-9360', '스테이션'),
      ('정세인', '010-9110-3130', '스테이션'),
      ('황혜지', '010-9182-2771', '스테이션'),
      ('박세윤', '010-6460-0609', '스테이션'),
      ('김관동', '010-9486-5083', '스테이션'),
      ('이대광', '010-3331-8794', '스테이션'),
      ('송용기', '010-9087-7701', '스테이션'),
      ('이영지', '010-4858-0527', '스테이션'),
      ('박범석', '010-8450-6558', '스테이션'),
      ('김지혜', '010-9313-1109', '스테이션'),
      ('김효주', '010-8013-3477', '스테이션'),
      ('김현영', '010-2712-4807', '스테이션'),
      ('이준욱', '010-2682-2095', '스테이션'),
      ('김희윤', '010-3179-1481', '스테이션'),
      ('박영욱', '010-9177-5163', '스테이션'),
      ('정지혜', '010-9969-6007', '스테이션'),
      ('이소라', '010-8727-0660', '스테이션'),
      ('홍세화', '010-6575-1612', '스테이션'),
      ('박익현', '010-8935-2452', '스테이션'),
      ('손우준', '010-9611-2596', '스테이션')
  ),
  desired_grants as (
    select
      t.id as tenant_id,
      tp.id as program_id,
      a.full_name,
      a.team_name,
      a.phone_number,
      public.normalize_phone_digits(a.phone_number) as phone_number_digits,
      g.user_id as granted_by
    from applicants a
    cross join target_tenant t
    join target_programs tp on tp.team_name = a.team_name
    cross join grantor g
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
  dg.tenant_id,
  dg.program_id,
  dg.full_name,
  dg.team_name,
  dg.phone_number,
  dg.phone_number_digits,
  '2026-08-16 15:00:00+00'::timestamptz,
  '2026-11-15 14:59:59.999+00'::timestamptz,
  now() + interval '14 days',
  dg.granted_by,
  true
from desired_grants dg
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

with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  applicants(full_name, phone_number, team_name) as (
    values
      ('성소리', '010-4165-6614', '러닝'),
      ('이수민', '010-9641-1156', '러닝'),
      ('허지영', '010-7762-8744', '러닝'),
      ('엄옥연', '010-8994-7435', '러닝'),
      ('김대호', '010-9930-3771', '스테이션'),
      ('김진주', '010-8554-8603', '스테이션'),
      ('정다은', '010-6412-8292', '스테이션'),
      ('김소현', '010-3020-9360', '스테이션'),
      ('정세인', '010-9110-3130', '스테이션'),
      ('황혜지', '010-9182-2771', '스테이션'),
      ('박세윤', '010-6460-0609', '스테이션'),
      ('김관동', '010-9486-5083', '스테이션'),
      ('이대광', '010-3331-8794', '스테이션'),
      ('송용기', '010-9087-7701', '스테이션'),
      ('이영지', '010-4858-0527', '스테이션'),
      ('박범석', '010-8450-6558', '스테이션'),
      ('김지혜', '010-9313-1109', '스테이션'),
      ('김효주', '010-8013-3477', '스테이션'),
      ('김현영', '010-2712-4807', '스테이션'),
      ('이준욱', '010-2682-2095', '스테이션'),
      ('김희윤', '010-3179-1481', '스테이션'),
      ('박영욱', '010-9177-5163', '스테이션'),
      ('정지혜', '010-9969-6007', '스테이션'),
      ('이소라', '010-8727-0660', '스테이션'),
      ('홍세화', '010-6575-1612', '스테이션'),
      ('박익현', '010-8935-2452', '스테이션'),
      ('손우준', '010-9611-2596', '스테이션')
  )
update public.entitlement_auto_grants eag
set is_active = false
from applicants a, target_tenant t, public.programs p
where eag.tenant_id = t.id
  and p.id = eag.program_id
  and eag.phone_number_digits = public.normalize_phone_digits(a.phone_number)
  and eag.team_name = a.team_name
  and p.title ilike '%JAMSIL%'
  and p.title ilike '%HYROX%'
  and (
    (a.team_name = '러닝' and p.title ilike '%스테이션%')
    or (a.team_name = '스테이션' and p.title ilike '%러닝%')
  );

with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  running_program as (
    select p.id
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title ilike '%JAMSIL%'
      and p.title ilike '%HYROX%'
      and p.title ilike '%러닝%'
    limit 1
  ),
  station_program as (
    select p.id
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title ilike '%JAMSIL%'
      and p.title ilike '%HYROX%'
      and p.title ilike '%스테이션%'
    limit 1
  ),
  running_grants as (
    select eag.*
    from public.entitlement_auto_grants eag
    join target_tenant t on t.id = eag.tenant_id
    where eag.team_name = '러닝'
      and eag.is_active = true
      and eag.matched_user_id is not null
      and eag.program_id = (select id from running_program)
  )
insert into public.program_entitlements (
  tenant_id,
  user_id,
  program_id,
  source_order_id,
  source_invitation_id,
  source_granted_by,
  starts_at,
  ends_at,
  is_active
)
select
  rg.tenant_id,
  rg.matched_user_id,
  rg.program_id,
  null,
  null,
  rg.granted_by,
  rg.starts_at,
  rg.ends_at,
  true
from running_grants rg
where not exists (
  select 1
  from public.program_entitlements pe
  where pe.tenant_id = rg.tenant_id
    and pe.user_id = rg.matched_user_id
    and pe.program_id = rg.program_id
    and pe.is_active = true
    and (pe.ends_at is null or pe.ends_at >= now())
);

with
  target_tenant as (
    select id
    from public.tenants
    where slug = 'xon-training'
    limit 1
  ),
  station_program as (
    select p.id
    from public.programs p
    join target_tenant t on t.id = p.tenant_id
    where p.title ilike '%JAMSIL%'
      and p.title ilike '%HYROX%'
      and p.title ilike '%스테이션%'
    limit 1
  ),
  running_users as (
    select eag.matched_user_id as user_id
    from public.entitlement_auto_grants eag
    join target_tenant t on t.id = eag.tenant_id
    where eag.team_name = '러닝'
      and eag.matched_user_id is not null
  )
update public.program_entitlements pe
set is_active = false
from running_users ru
where pe.tenant_id = (select id from target_tenant)
  and pe.user_id = ru.user_id
  and pe.program_id = (select id from station_program)
  and pe.source_order_id is null
  and pe.source_invitation_id is null
  and pe.is_active = true;

update public.tenant_user_profiles tup
set phone_number = tup.phone_number
from public.entitlement_auto_grants eag
where tup.tenant_id = eag.tenant_id
  and public.normalize_phone_digits(tup.phone_number) = eag.phone_number_digits
  and eag.is_active = true
  and (eag.expires_at is null or eag.expires_at >= now());
