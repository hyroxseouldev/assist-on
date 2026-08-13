alter table if exists public.entitlement_auto_grants
add column if not exists expires_at timestamptz;

update public.entitlement_auto_grants eag
set expires_at = now() + interval '14 days'
where eag.tenant_id = (select id from public.tenants where slug = 'xon-training')
  and eag.program_id = (
    select p.id
    from public.programs p
    where p.tenant_id = eag.tenant_id
      and p.title = 'XON DANGSAN | 12주 HYROX 프로그램'
    limit 1
  )
  and eag.expires_at is null;

create or replace function public.apply_entitlement_auto_grants_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_phone_digits text;
  v_grant public.entitlement_auto_grants%rowtype;
  v_existing_entitlement_id uuid;
begin
  v_phone_digits := public.normalize_phone_digits(new.phone_number);

  if v_phone_digits = '' then
    return new;
  end if;

  for v_grant in
    select *
    from public.entitlement_auto_grants
    where tenant_id = new.tenant_id
      and phone_number_digits = v_phone_digits
      and is_active = true
      and (expires_at is null or expires_at >= now())
  loop
    insert into public.tenant_memberships (tenant_id, user_id, role)
    values (new.tenant_id, new.user_id, 'member')
    on conflict (tenant_id, user_id) do nothing;

    select pe.id
    into v_existing_entitlement_id
    from public.program_entitlements pe
    where pe.tenant_id = new.tenant_id
      and pe.user_id = new.user_id
      and pe.program_id = v_grant.program_id
      and pe.is_active = true
      and (pe.ends_at is null or pe.ends_at >= now())
    order by pe.created_at desc
    limit 1;

    if v_existing_entitlement_id is null then
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
      values (
        new.tenant_id,
        new.user_id,
        v_grant.program_id,
        null,
        null,
        v_grant.granted_by,
        v_grant.starts_at,
        v_grant.ends_at,
        true
      );
    end if;

    insert into public.user_program_states (tenant_id, user_id, active_program_id)
    values (new.tenant_id, new.user_id, v_grant.program_id)
    on conflict (tenant_id, user_id) do update
    set active_program_id = excluded.active_program_id;

    update public.entitlement_auto_grants
    set
      matched_user_id = new.user_id,
      matched_at = coalesce(matched_at, now())
    where id = v_grant.id;
  end loop;

  return new;
end;
$$;
