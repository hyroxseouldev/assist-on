create table if not exists public.guest_order_coupons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  discount_type text not null,
  discount_value integer not null,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_order_coupons_code_check check (code = upper(btrim(code)) and code ~ '^[A-Z0-9_-]{2,40}$'),
  constraint guest_order_coupons_discount_type_check check (discount_type in ('amount', 'percent')),
  constraint guest_order_coupons_discount_value_check check (
    (discount_type = 'amount' and discount_value > 0)
    or (discount_type = 'percent' and discount_value between 1 and 100)
  ),
  constraint guest_order_coupons_usage_limit_check check (usage_limit is null or usage_limit > 0),
  constraint guest_order_coupons_used_count_check check (used_count >= 0),
  constraint guest_order_coupons_date_range_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists uq_guest_order_coupons_tenant_code_lower
on public.guest_order_coupons(tenant_id, lower(code));

create index if not exists idx_guest_order_coupons_tenant_active
on public.guest_order_coupons(tenant_id, is_active);

drop trigger if exists trg_guest_order_coupons_updated_at on public.guest_order_coupons;
create trigger trg_guest_order_coupons_updated_at
before update on public.guest_order_coupons
for each row
execute function public.touch_program_store_updated_at();

alter table public.guest_order_coupons enable row level security;

drop policy if exists "Tenant managers can manage guest order coupons" on public.guest_order_coupons;
create policy "Tenant managers can manage guest order coupons"
on public.guest_order_coupons
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
