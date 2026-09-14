create table public.billing_program_selections (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  included_program_ids uuid[] not null default '{}',
  excluded_program_ids uuid[] not null default '{}',
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, month),
  check (not (included_program_ids && excluded_program_ids))
);
alter table public.billing_program_selections enable row level security;
revoke all on public.billing_program_selections from anon, authenticated;
grant all on public.billing_program_selections to service_role;

create function public.save_billing_program_selection(
  p_tenant_id uuid, p_actor_id uuid, p_month text,
  p_included_ids uuid[], p_excluded_ids uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not coalesce(public.is_admin(p_actor_id), false) then
    raise exception '플랫폼 관리자만 청구 프로그램을 설정할 수 있습니다.' using errcode='42501';
  end if;
  if p_month is null or p_month !~ '^\d{4}-(0[1-9]|1[0-2])$'
    or p_included_ids is null or p_excluded_ids is null
    or cardinality(p_included_ids) + cardinality(p_excluded_ids) > 2000
    or p_included_ids && p_excluded_ids then
    raise exception '청구월과 프로그램 선택을 확인해 주세요.';
  end if;
  if exists (
    select 1 from unnest(p_included_ids || p_excluded_ids) id
    where id is null or not exists (
      select 1 from public.programs p where p.id=id and p.tenant_id=p_tenant_id
    )
  ) then raise exception '해당 고객사의 프로그램만 선택할 수 있습니다.'; end if;
  insert into public.billing_settings(tenant_id) values(p_tenant_id) on conflict do nothing;
  perform 1 from public.billing_settings where tenant_id=p_tenant_id for update;
  if exists(select 1 from public.billing_invoices where tenant_id=p_tenant_id and month=p_month) then
    raise exception '이미 확정된 청구월입니다.';
  end if;
  insert into public.billing_program_selections(tenant_id, month, included_program_ids, excluded_program_ids, updated_by)
  values(p_tenant_id, p_month,
    array(select distinct id from unnest(p_included_ids) id order by id),
    array(select distinct id from unnest(p_excluded_ids) id order by id), p_actor_id)
  on conflict (tenant_id,month) do update set
    included_program_ids=excluded.included_program_ids,
    excluded_program_ids=excluded.excluded_program_ids,
    updated_by=excluded.updated_by, updated_at=now();
end;
$$;
revoke all on function public.save_billing_program_selection(uuid,uuid,text,uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.save_billing_program_selection(uuid,uuid,text,uuid[],uuid[]) to service_role;

-- Serialize with selection saves and reject snapshots calculated before a selection edit.
create function billing_private.guard_invoice_program_selection() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare expected jsonb;
begin
  perform 1 from public.billing_settings where tenant_id=new.tenant_id for update;
  select jsonb_build_object('includedProgramIds', included_program_ids, 'excludedProgramIds', excluded_program_ids)
    into expected from public.billing_program_selections where tenant_id=new.tenant_id and month=new.month;
  expected := coalesce(expected, '{"includedProgramIds":[],"excludedProgramIds":[]}'::jsonb);
  if coalesce(new.snapshot->'programOverrides', '{"includedProgramIds":[],"excludedProgramIds":[]}'::jsonb) <> expected then
    raise exception '청구 프로그램 선택이 변경되었습니다. 새로고침 후 다시 확인해 주세요.';
  end if;
  return new;
end;
$$;
revoke all on function billing_private.guard_invoice_program_selection() from public,anon,authenticated;
create trigger billing_guard_invoice_program_selection before insert on public.billing_invoices
for each row execute function billing_private.guard_invoice_program_selection();
