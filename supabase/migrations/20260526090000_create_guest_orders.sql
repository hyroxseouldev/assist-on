create table if not exists public.guest_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status text not null default 'pending',
  buyer_name text not null,
  buyer_phone text not null,
  buyer_phone_normalized text not null,
  order_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  canceled_at timestamptz,
  constraint guest_orders_status_check check (status in ('pending', 'confirmed', 'canceled')),
  constraint guest_orders_buyer_name_check check (char_length(btrim(buyer_name)) > 0),
  constraint guest_orders_buyer_phone_normalized_check check (buyer_phone_normalized ~ '^[0-9]{9,12}$'),
  constraint guest_orders_order_payload_object_check check (jsonb_typeof(order_payload) = 'object')
);

create index if not exists idx_guest_orders_tenant_created_at
on public.guest_orders(tenant_id, created_at desc);

create index if not exists idx_guest_orders_tenant_status
on public.guest_orders(tenant_id, status);

create index if not exists idx_guest_orders_lookup
on public.guest_orders(tenant_id, buyer_phone_normalized, buyer_name);

drop trigger if exists trg_guest_orders_updated_at on public.guest_orders;
create trigger trg_guest_orders_updated_at
before update on public.guest_orders
for each row
execute function public.touch_program_store_updated_at();

alter table public.guest_orders enable row level security;
