create table public.billing_member_exclusions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  program_id uuid,
  scope_key text generated always as (coalesce(program_id::text, 'tenant')) stored,
  reason text not null check (length(btrim(reason)) between 1 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  unique (tenant_id, user_id, scope_key)
);
-- User/program identifiers are retained for historical exclusions after deletion.
-- Active scope validity is checked below; no access/entitlement data is mutated.
alter table public.billing_member_exclusions enable row level security;
revoke all on public.billing_member_exclusions from public, anon, authenticated;
grant select on public.billing_member_exclusions to authenticated;
grant select, insert, update on public.billing_member_exclusions to service_role;
create policy billing_member_exclusions_read on public.billing_member_exclusions
for select to authenticated using (
  (select public.is_admin(auth.uid())) or public.is_tenant_owner(tenant_id)
);

create function billing_private.guard_member_exclusion() returns trigger
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
    then raise exception '해당 고객사의 회원이 아닙니다.'; end if;
  end if;
  new.reason := btrim(new.reason);
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function billing_private.guard_member_exclusion() from public, anon, authenticated;
create trigger billing_guard_member_exclusion before insert or update
on public.billing_member_exclusions for each row execute function billing_private.guard_member_exclusion();
