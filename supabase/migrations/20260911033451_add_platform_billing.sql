-- Platform-to-tenant billing, separate from member product purchases.
create table public.billing_settings (
  tenant_id uuid primary key references public.tenants(id),
  billing_day integer not null default 18 check (billing_day between 1 and 31),
  unit_price integer not null default 7500 check (unit_price between 0 and 10000000)
);
create table public.billing_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  program_ids uuid[] not null check (cardinality(program_ids) between 1 and 100),
  unit_price integer not null check (unit_price between 0 and 10000000),
  starts_on date not null,
  first_month text not null check (first_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  last_month text check (last_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and last_month >= first_month),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index billing_contracts_tenant on public.billing_contracts(tenant_id);
create index billing_contracts_creator on public.billing_contracts(created_by);

-- Append historical access segments. No cascading FK to mutable entitlements/users.
create table public.billing_access_periods (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  entitlement_id uuid not null,
  user_id uuid not null,
  program_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  closed_at timestamptz,
  needs_review boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index billing_access_tenant_program on public.billing_access_periods(tenant_id, program_id, starts_at);
create unique index billing_access_open on public.billing_access_periods(entitlement_id) where closed_at is null;

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  amount bigint not null check (amount >= 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  payment_note text,
  paid_by uuid references auth.users(id),
  unique (tenant_id, month)
);
create index billing_invoices_creator on public.billing_invoices(created_by);
create index billing_invoices_paid_by on public.billing_invoices(paid_by);

alter table public.billing_settings enable row level security;
alter table public.billing_contracts enable row level security;
alter table public.billing_access_periods enable row level security;
alter table public.billing_invoices enable row level security;
revoke all on public.billing_settings, public.billing_contracts, public.billing_access_periods, public.billing_invoices from anon, authenticated;
grant select on public.billing_settings, public.billing_contracts, public.billing_access_periods, public.billing_invoices to authenticated;
grant all on public.billing_settings, public.billing_contracts, public.billing_access_periods, public.billing_invoices to service_role;
create policy billing_settings_read on public.billing_settings for select to authenticated using ((select public.is_admin(auth.uid())) or public.is_tenant_owner(tenant_id));
create policy billing_contracts_read on public.billing_contracts for select to authenticated using ((select public.is_admin(auth.uid())) or public.is_tenant_owner(tenant_id));
create policy billing_access_read on public.billing_access_periods for select to authenticated using ((select public.is_admin(auth.uid())) or public.is_tenant_owner(tenant_id));
create policy billing_invoices_read on public.billing_invoices for select to authenticated using ((select public.is_admin(auth.uid())) or public.is_tenant_owner(tenant_id));

create schema if not exists billing_private;
revoke all on schema billing_private from public, anon, authenticated;

-- Internal trigger only. Existing entitlement RLS authorizes the source mutation.
-- Definer privileges are necessary to append an immutable ledger from those writes.
create function billing_private.capture_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null
    and session_user not in ('postgres', 'supabase_admin', 'supabase_auth_admin')
    and (auth.jwt()->>'role') is distinct from 'service_role' then
    raise exception 'Authenticated entitlement change required' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and row(new.tenant_id,new.user_id,new.program_id,new.starts_at,new.ends_at,new.is_active)
    is not distinct from row(old.tenant_id,old.user_id,old.program_id,old.starts_at,old.ends_at,old.is_active) then
    return new;
  end if;
  if tg_op <> 'INSERT' then
    update public.billing_access_periods
      set closed_at = case when tg_op = 'UPDATE' then least(now(), new.ends_at) else now() end
      where entitlement_id = old.id and closed_at is null;
  end if;
  if tg_op <> 'DELETE' and new.is_active then
    insert into public.billing_access_periods(tenant_id,entitlement_id,user_id,program_id,starts_at,ends_at)
    values(new.tenant_id,new.id,new.user_id,new.program_id,
      case when tg_op = 'INSERT' then new.starts_at else greatest(new.starts_at,now()) end,new.ends_at);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function billing_private.capture_access() from public, anon, authenticated;
create trigger billing_capture_entitlement after insert or update or delete on public.program_entitlements
for each row execute function billing_private.capture_access();

insert into public.billing_access_periods(tenant_id,entitlement_id,user_id,program_id,starts_at,ends_at,closed_at,needs_review)
select e.tenant_id,e.id,e.user_id,e.program_id,e.starts_at,e.ends_at,
  case when e.is_active then null else coalesce(h.changed_at, least(e.ends_at,now())) end,
  not e.is_active and h.changed_at is null
from public.program_entitlements e
left join lateral (
  select min(created_at) changed_at from public.program_entitlement_change_history
  where tenant_id=e.tenant_id and from_entitlement_id=e.id
) h on true;

create function billing_private.guard_contract() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.billing_settings where tenant_id=new.tenant_id for update;
  if not found then raise exception '청구 설정을 먼저 저장해 주세요.'; end if;
  if tg_op='UPDATE' then
    if row(new.id,new.tenant_id,new.title,new.program_ids,new.unit_price,new.starts_on,new.first_month,new.created_by,new.created_at)
      is distinct from row(old.id,old.tenant_id,old.title,old.program_ids,old.unit_price,old.starts_on,old.first_month,old.created_by,old.created_at)
      or new.last_month is null or (old.last_month is not null and new.last_month > old.last_month) then
      raise exception '마지막 청구월만 앞당길 수 있습니다. 다른 변경은 새 계약을 등록해 주세요.';
    end if;
    if exists(select 1 from public.billing_invoices where tenant_id=new.tenant_id
      and month > new.last_month and month <= coalesce(old.last_month,'9999-12')
      and snapshot->'lines' @> jsonb_build_array(jsonb_build_object('contractId',new.id::text))) then
      raise exception '이미 확정된 청구월 이전으로 종료할 수 없습니다.';
    end if;
    return new;
  end if;
  if exists (select 1 from unnest(new.program_ids) p(id) where not exists (
    select 1 from public.programs where id=p.id and tenant_id=new.tenant_id
  )) then raise exception '다른 고객사의 프로그램은 연결할 수 없습니다.'; end if;
  if exists (select 1 from public.billing_contracts c where c.tenant_id=new.tenant_id and c.id<>new.id
    and c.program_ids && new.program_ids
    and c.first_month <= coalesce(new.last_month,'9999-12')
    and new.first_month <= coalesce(c.last_month,'9999-12')) then
    raise exception '같은 청구월에 프로그램이 중복 계약되어 있습니다.';
  end if;
  if exists (select 1 from public.billing_invoices where tenant_id=new.tenant_id
    and month >= new.first_month and month <= coalesce(new.last_month,'9999-12')) then
    raise exception '이미 확정된 청구월이 포함되어 있습니다. 이후 월부터 계약해 주세요.';
  end if;
  return new;
end;
$$;
create trigger billing_guard_contract before insert or update on public.billing_contracts for each row execute function billing_private.guard_contract();

create function billing_private.guard_settings() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.billing_day<>old.billing_day and exists(select 1 from public.billing_contracts where tenant_id=old.tenant_id) then
    raise exception '계약 등록 후에는 청구일을 변경할 수 없습니다. 기간 중복 방지를 위해 별도 전환이 필요합니다.';
  end if;
  return new;
end;
$$;
create trigger billing_guard_settings before update on public.billing_settings for each row execute function billing_private.guard_settings();

create function billing_private.guard_invoice() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='DELETE' then raise exception '확정된 청구서는 삭제할 수 없습니다.'; end if;
  if row(new.tenant_id,new.month,new.amount,new.snapshot,new.created_by,new.created_at)
    is distinct from row(old.tenant_id,old.month,old.amount,old.snapshot,old.created_by,old.created_at) then
    raise exception '확정된 청구 내역은 변경할 수 없습니다.';
  end if;
  if old.paid_at is not null then raise exception '이미 입금 확인된 청구서입니다.'; end if;
  return new;
end;
$$;
create trigger billing_guard_invoice before update or delete on public.billing_invoices for each row execute function billing_private.guard_invoice();
revoke all on function billing_private.guard_contract(), billing_private.guard_settings(), billing_private.guard_invoice() from public, anon, authenticated;

-- The application rechecks identity and builds the snapshot server-side.
create function public.finalize_billing_invoice(p_tenant_id uuid,p_actor_id uuid,p_month text,p_snapshot jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare invoice_id uuid;
begin
  if not coalesce(public.is_admin(p_actor_id),false) then raise exception '플랫폼 관리자만 청구를 확정할 수 있습니다.' using errcode='42501'; end if;
  perform 1 from public.billing_settings where tenant_id=p_tenant_id for update;
  if p_snapshot->>'month' <> p_month or (p_snapshot->>'dueDate')::date > (now() at time zone 'Asia/Seoul')::date then
    raise exception '청구일 이후에 확정할 수 있습니다.';
  end if;
  if jsonb_array_length(p_snapshot->'lines')=0 then raise exception '청구 계약이 없습니다.'; end if;
  if (p_snapshot->>'total')::bigint <> (select sum((l->>'amount')::bigint) from jsonb_array_elements(p_snapshot->'lines') l) then
    raise exception '청구 금액이 일치하지 않습니다.';
  end if;
  insert into public.billing_invoices(tenant_id,month,amount,snapshot,created_by)
  values(p_tenant_id,p_month,(p_snapshot->>'total')::bigint,p_snapshot,p_actor_id)
  returning id into invoice_id;
  return invoice_id;
end;
$$;
revoke all on function public.finalize_billing_invoice(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_billing_invoice(uuid,uuid,text,jsonb) to service_role;
