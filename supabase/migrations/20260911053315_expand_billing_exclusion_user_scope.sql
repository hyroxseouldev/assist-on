-- Match the tenant-wide user search, including profiles without memberships
-- or billable access. No auth role or direct table-write privileges change.
create or replace function billing_private.guard_member_exclusion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='UPDATE' and (new.tenant_id<>old.tenant_id or new.user_id<>old.user_id
    or new.program_id is distinct from old.program_id) then
    raise exception '청구 제외 범위는 변경할 수 없습니다. 해제 후 다시 등록해 주세요.';
  end if;
  if new.is_active then
    if new.program_id is not null and not exists (
      select 1 from public.programs where id=new.program_id and tenant_id=new.tenant_id
    ) then raise exception '해당 고객사의 프로그램이 아닙니다.'; end if;
    if not exists (select 1 from public.tenant_memberships where tenant_id=new.tenant_id and user_id=new.user_id)
      and not exists (select 1 from public.billing_access_periods where tenant_id=new.tenant_id and user_id=new.user_id)
      and not exists (select 1 from public.tenant_user_profiles where tenant_id=new.tenant_id and user_id=new.user_id)
      and not exists (select 1 from public.program_entitlements where tenant_id=new.tenant_id and user_id=new.user_id)
      and not exists (select 1 from public.user_program_states where tenant_id=new.tenant_id and user_id=new.user_id)
      and not exists (select 1 from public.user_workout_records_v2 where tenant_id=new.tenant_id and user_id=new.user_id)
    then raise exception '해당 고객사의 회원이 아닙니다.'; end if;
  end if;
  new.reason := btrim(new.reason);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function billing_private.guard_member_exclusion() from public, anon, authenticated;
