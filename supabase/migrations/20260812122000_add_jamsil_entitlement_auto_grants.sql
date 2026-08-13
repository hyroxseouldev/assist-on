alter table if exists public.entitlement_auto_grants
add column if not exists team_name text;

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
    where
      p.title = 'XON JAMSIL | 10주 HYROX 프로그램'
      or (
        p.title ilike '%HYROX%'
        and (
          p.title ilike '%JAMSIL%'
          or p.title ilike '%잠실%'
        )
      )
    order by
      case
        when p.title = 'XON JAMSIL | 10주 HYROX 프로그램' then 0
        when p.title ilike '%JAMSIL%' then 1
        else 2
      end,
      p.created_at desc
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
from applicants a
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
  and eag.is_active = true
  and (eag.expires_at is null or eag.expires_at >= now());
