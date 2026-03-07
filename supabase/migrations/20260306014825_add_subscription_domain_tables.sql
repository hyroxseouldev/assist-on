alter table if exists public.program_products
add column if not exists sale_type text not null default 'one_time';

alter table if exists public.program_products
add column if not exists billing_interval text;

alter table if exists public.program_products
add column if not exists billing_anchor_day smallint;

alter table if exists public.program_products
add column if not exists subscription_grace_days integer not null default 3;

alter table if exists public.program_products
drop constraint if exists program_products_sale_type_check;

alter table if exists public.program_products
add constraint program_products_sale_type_check
check (sale_type in ('one_time', 'subscription'));

alter table if exists public.program_products
drop constraint if exists program_products_billing_interval_check;

alter table if exists public.program_products
add constraint program_products_billing_interval_check
check (billing_interval is null or billing_interval in ('monthly'));

alter table if exists public.program_products
drop constraint if exists program_products_billing_anchor_day_check;

alter table if exists public.program_products
add constraint program_products_billing_anchor_day_check
check (billing_anchor_day is null or (billing_anchor_day between 1 and 28));

alter table if exists public.program_products
drop constraint if exists program_products_subscription_grace_days_check;

alter table if exists public.program_products
add constraint program_products_subscription_grace_days_check
check (subscription_grace_days between 0 and 30);

alter table if exists public.program_products
drop constraint if exists program_products_sale_type_config_check;

alter table if exists public.program_products
add constraint program_products_sale_type_config_check
check (
  (sale_type = 'one_time' and billing_interval is null)
  or (sale_type = 'subscription' and billing_interval = 'monthly')
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.program_products(id) on delete cascade,
  status text not null default 'active',
  provider text not null default 'toss',
  billing_key text,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  current_period_start_at timestamptz,
  current_period_end_at timestamptz,
  next_billing_at timestamptz,
  last_paid_at timestamptz,
  last_failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_status_check check (status in ('incomplete', 'active', 'past_due', 'canceled')),
  constraint user_subscriptions_cancel_consistency_check check (
    (cancel_at_period_end = false and canceled_at is null)
    or (cancel_at_period_end = true and canceled_at is not null)
  )
);

create table if not exists public.subscription_cycles (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  cycle_index integer not null,
  cycle_start_at timestamptz not null,
  cycle_end_at timestamptz not null,
  amount_krw integer not null,
  status text not null default 'pending',
  provider_order_id text,
  provider_payment_key text,
  fail_reason text,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_cycles_amount_positive check (amount_krw > 0),
  constraint subscription_cycles_status_check check (status in ('pending', 'paid', 'failed', 'canceled')),
  constraint subscription_cycles_unique_cycle unique (subscription_id, cycle_index)
);

create unique index if not exists uq_user_subscriptions_active
on public.user_subscriptions(tenant_id, user_id, product_id)
where status in ('incomplete', 'active', 'past_due');

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_tenant_id on public.user_subscriptions(tenant_id);
create index if not exists idx_user_subscriptions_product_id on public.user_subscriptions(product_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);
create index if not exists idx_user_subscriptions_next_billing_at on public.user_subscriptions(next_billing_at);
create index if not exists idx_subscription_cycles_subscription_id on public.subscription_cycles(subscription_id);
create index if not exists idx_subscription_cycles_status on public.subscription_cycles(status);
create index if not exists idx_subscription_cycles_created_at on public.subscription_cycles(created_at);

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.touch_program_store_updated_at();

drop trigger if exists trg_subscription_cycles_updated_at on public.subscription_cycles;
create trigger trg_subscription_cycles_updated_at
before update on public.subscription_cycles
for each row
execute function public.touch_program_store_updated_at();

alter table public.user_subscriptions enable row level security;
alter table public.subscription_cycles enable row level security;

drop policy if exists "Users can read own subscriptions" on public.user_subscriptions;
create policy "Users can read own subscriptions"
on public.user_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_tenant_content_manager(tenant_id)
);

drop policy if exists "Users can manage own subscriptions" on public.user_subscriptions;
create policy "Users can manage own subscriptions"
on public.user_subscriptions
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Tenant managers can manage subscriptions" on public.user_subscriptions;
create policy "Tenant managers can manage subscriptions"
on public.user_subscriptions
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Users can read own subscription cycles" on public.subscription_cycles;
create policy "Users can read own subscription cycles"
on public.subscription_cycles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_cycles.subscription_id
      and (
        us.user_id = auth.uid()
        or public.is_tenant_content_manager(us.tenant_id)
      )
  )
);

drop policy if exists "Users can manage own subscription cycles" on public.subscription_cycles;
create policy "Users can manage own subscription cycles"
on public.subscription_cycles
for all
to authenticated
using (
  exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_cycles.subscription_id
      and us.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_cycles.subscription_id
      and us.user_id = auth.uid()
  )
);

drop policy if exists "Tenant managers can manage subscription cycles" on public.subscription_cycles;
create policy "Tenant managers can manage subscription cycles"
on public.subscription_cycles
for all
to authenticated
using (
  exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_cycles.subscription_id
      and public.is_tenant_content_manager(us.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.user_subscriptions us
    where us.id = subscription_cycles.subscription_id
      and public.is_tenant_content_manager(us.tenant_id)
  )
);
