create table if not exists public.program_product_duration_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.program_products(id) on delete cascade,
  duration_months integer not null,
  price_krw integer not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_product_duration_options_duration_check check (duration_months in (1, 2, 3, 6)),
  constraint program_product_duration_options_price_check check (price_krw > 0),
  constraint program_product_duration_options_unique unique (product_id, duration_months)
);

create index if not exists idx_program_product_duration_options_product_id
on public.program_product_duration_options(product_id);

drop trigger if exists trg_program_product_duration_options_updated_at on public.program_product_duration_options;
create trigger trg_program_product_duration_options_updated_at
before update on public.program_product_duration_options
for each row
execute function public.touch_program_store_updated_at();

alter table public.program_product_duration_options enable row level security;

drop policy if exists "Public can read duration options of visible products" on public.program_product_duration_options;
create policy "Public can read duration options of visible products"
on public.program_product_duration_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.program_products pp
    where pp.id = product_id
      and pp.sale_status in ('active', 'preparing')
  )
);

drop policy if exists "Tenant managers can manage duration options" on public.program_product_duration_options;
create policy "Tenant managers can manage duration options"
on public.program_product_duration_options
for all
to authenticated
using (
  exists (
    select 1
    from public.program_products pp
    where pp.id = product_id
      and public.is_tenant_content_manager(pp.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.program_products pp
    where pp.id = product_id
      and public.is_tenant_content_manager(pp.tenant_id)
  )
);

alter table public.program_orders
add column if not exists duration_months integer;

alter table public.program_orders
drop constraint if exists program_orders_duration_months_check;

alter table public.program_orders
add constraint program_orders_duration_months_check
check (duration_months is null or duration_months in (1, 2, 3, 6));

insert into public.program_product_duration_options (product_id, duration_months, price_krw, is_enabled)
select pp.id, 1, pp.price_krw, true
from public.program_products pp
where coalesce(pp.sale_type, 'one_time') = 'one_time'
  and not exists (
    select 1
    from public.program_product_duration_options pdo
    where pdo.product_id = pp.id
  );
