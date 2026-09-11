-- Existing billing_settings RLS and grants also protect this column.
alter table public.billing_settings
  add column excluded_program_ids uuid[] not null default '{}';

create or replace function billing_private.guard_settings() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.billing_day <> old.billing_day and (
    exists(select 1 from public.billing_contracts where tenant_id=old.tenant_id)
    or exists(select 1 from public.billing_invoices where tenant_id=old.tenant_id)
  ) then
    raise exception '계약 등록 또는 청구 확정 후에는 청구일을 변경할 수 없습니다. 기간 중복 방지를 위해 별도 전환이 필요합니다.';
  end if;
  return new;
end;
$$;
revoke all on function billing_private.guard_settings() from public, anon, authenticated;
