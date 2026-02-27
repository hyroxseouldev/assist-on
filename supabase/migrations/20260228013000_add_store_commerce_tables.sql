create table if not exists public.program_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  price_krw integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_products_price_positive check (price_krw > 0),
  constraint program_products_tenant_program_unique unique (tenant_id, program_id)
);

create table if not exists public.program_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.program_products(id) on delete restrict,
  amount_krw integer not null,
  status text not null default 'pending',
  provider text not null default 'toss',
  provider_order_id text not null unique,
  payment_key text unique,
  raw_confirm jsonb,
  fail_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_orders_amount_positive check (amount_krw > 0),
  constraint program_orders_status_check check (status in ('pending', 'paid', 'failed', 'canceled', 'refunded'))
);

create table if not exists public.program_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  source_order_id uuid not null unique references public.program_orders(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_program_products_tenant_id on public.program_products(tenant_id);
create index if not exists idx_program_products_program_id on public.program_products(program_id);
create index if not exists idx_program_orders_tenant_id on public.program_orders(tenant_id);
create index if not exists idx_program_orders_buyer_user_id on public.program_orders(buyer_user_id);
create index if not exists idx_program_orders_product_id on public.program_orders(product_id);
create index if not exists idx_program_orders_status on public.program_orders(status);
create index if not exists idx_program_entitlements_user_program on public.program_entitlements(user_id, program_id);
create index if not exists idx_program_entitlements_tenant_id on public.program_entitlements(tenant_id);

create unique index if not exists uq_program_entitlements_active
on public.program_entitlements(tenant_id, user_id, program_id)
where is_active = true;

create or replace function public.touch_program_store_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_program_products_updated_at on public.program_products;
create trigger trg_program_products_updated_at
before update on public.program_products
for each row
execute function public.touch_program_store_updated_at();

drop trigger if exists trg_program_orders_updated_at on public.program_orders;
create trigger trg_program_orders_updated_at
before update on public.program_orders
for each row
execute function public.touch_program_store_updated_at();

drop trigger if exists trg_program_entitlements_updated_at on public.program_entitlements;
create trigger trg_program_entitlements_updated_at
before update on public.program_entitlements
for each row
execute function public.touch_program_store_updated_at();

insert into public.program_products (tenant_id, program_id, price_krw)
select p.tenant_id, p.id, 99000
from public.programs p
where p.tenant_id is not null
  and not exists (
    select 1
    from public.program_products pp
    where pp.tenant_id = p.tenant_id
      and pp.program_id = p.id
  );

alter table public.program_products enable row level security;
alter table public.program_orders enable row level security;
alter table public.program_entitlements enable row level security;

drop policy if exists "Public can read active program products" on public.program_products;
create policy "Public can read active program products"
on public.program_products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Tenant managers can manage program products" on public.program_products;
create policy "Tenant managers can manage program products"
on public.program_products
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Users can create own pending program orders" on public.program_orders;
create policy "Users can create own pending program orders"
on public.program_orders
for insert
to authenticated
with check (
  buyer_user_id = auth.uid()
  and exists (
    select 1
    from public.program_products pp
    where pp.id = product_id
      and pp.tenant_id = program_orders.tenant_id
      and pp.is_active = true
  )
);

drop policy if exists "Users can read own program orders" on public.program_orders;
create policy "Users can read own program orders"
on public.program_orders
for select
to authenticated
using (
  buyer_user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_id)
);

drop policy if exists "Users can update own pending program orders" on public.program_orders;
create policy "Users can update own pending program orders"
on public.program_orders
for update
to authenticated
using (
  buyer_user_id = auth.uid()
  and status = 'pending'
)
with check (
  buyer_user_id = auth.uid()
);

drop policy if exists "Tenant managers can manage program orders" on public.program_orders;
create policy "Tenant managers can manage program orders"
on public.program_orders
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Users can read own entitlements" on public.program_entitlements;
create policy "Users can read own entitlements"
on public.program_entitlements
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_id)
);

drop policy if exists "Users can create own paid entitlements" on public.program_entitlements;
create policy "Users can create own paid entitlements"
on public.program_entitlements
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.program_orders po
    where po.id = source_order_id
      and po.tenant_id = program_entitlements.tenant_id
      and po.buyer_user_id = auth.uid()
      and po.status = 'paid'
  )
);

drop policy if exists "Tenant managers can manage entitlements" on public.program_entitlements;
create policy "Tenant managers can manage entitlements"
on public.program_entitlements
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
