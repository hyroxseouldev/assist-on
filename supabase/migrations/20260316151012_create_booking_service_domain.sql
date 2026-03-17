create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  pending_hold_minutes integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_services_name_not_blank check (char_length(trim(name)) > 0),
  constraint booking_services_pending_hold_minutes_non_negative check (pending_hold_minutes >= 0)
);

create table if not exists public.booking_service_options (
  id uuid primary key default gen_random_uuid(),
  booking_service_id uuid not null references public.booking_services(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_krw integer not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_service_options_name_not_blank check (char_length(trim(name)) > 0),
  constraint booking_service_options_price_positive check (price_krw > 0)
);

create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_service_id uuid not null references public.booking_services(id) on delete cascade,
  slot_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_slots_duration_minutes_check check (duration_minutes in (60, 90)),
  constraint booking_slots_status_check check (status in ('open', 'pending', 'booked', 'blocked', 'closed')),
  constraint booking_slots_time_order check (ends_at > starts_at),
  constraint booking_slots_unique_service_start unique (booking_service_id, starts_at)
);

create table if not exists public.booking_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_service_id uuid not null references public.booking_services(id) on delete restrict,
  slot_id uuid not null references public.booking_slots(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  booking_option_id uuid not null references public.booking_service_options(id) on delete restrict,
  price_krw integer not null,
  status text not null default 'requested',
  booker_name text not null default '',
  booker_phone text not null default '',
  user_memo text not null default '',
  admin_memo text not null default '',
  pending_expires_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  canceled_at timestamptz,
  canceled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_reservations_price_positive check (price_krw > 0),
  constraint booking_reservations_status_check check (status in ('requested', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show', 'expired'))
);

create table if not exists public.booking_reservation_status_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reservation_id uuid not null references public.booking_reservations(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint booking_reservation_status_logs_to_status_check check (to_status in ('requested', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show', 'expired')),
  constraint booking_reservation_status_logs_from_status_check check (from_status is null or from_status in ('requested', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show', 'expired'))
);

create index if not exists idx_booking_services_tenant_id on public.booking_services(tenant_id);
create index if not exists idx_booking_service_options_service_id on public.booking_service_options(booking_service_id);
create index if not exists idx_booking_slots_tenant_slot_date on public.booking_slots(tenant_id, slot_date);
create index if not exists idx_booking_slots_service_starts_at on public.booking_slots(booking_service_id, starts_at);
create index if not exists idx_booking_slots_status_starts_at on public.booking_slots(status, starts_at);
create index if not exists idx_booking_reservations_tenant_created_at on public.booking_reservations(tenant_id, created_at desc);
create index if not exists idx_booking_reservations_slot_id on public.booking_reservations(slot_id);
create index if not exists idx_booking_reservations_user_id on public.booking_reservations(user_id);
create index if not exists idx_booking_reservation_status_logs_reservation_id on public.booking_reservation_status_logs(reservation_id);
create index if not exists idx_booking_reservation_status_logs_tenant_id on public.booking_reservation_status_logs(tenant_id);

create unique index if not exists uq_booking_service_options_service_name
on public.booking_service_options(booking_service_id, lower(name));

create unique index if not exists uq_booking_reservations_active_slot
on public.booking_reservations(slot_id)
where status in ('requested', 'confirmed');

create or replace function public.touch_booking_service_domain_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_booking_services_updated_at on public.booking_services;
create trigger trg_booking_services_updated_at
before update on public.booking_services
for each row
execute function public.touch_booking_service_domain_updated_at();

drop trigger if exists trg_booking_service_options_updated_at on public.booking_service_options;
create trigger trg_booking_service_options_updated_at
before update on public.booking_service_options
for each row
execute function public.touch_booking_service_domain_updated_at();

drop trigger if exists trg_booking_slots_updated_at on public.booking_slots;
create trigger trg_booking_slots_updated_at
before update on public.booking_slots
for each row
execute function public.touch_booking_service_domain_updated_at();

drop trigger if exists trg_booking_reservations_updated_at on public.booking_reservations;
create trigger trg_booking_reservations_updated_at
before update on public.booking_reservations
for each row
execute function public.touch_booking_service_domain_updated_at();

alter table public.booking_services enable row level security;
alter table public.booking_service_options enable row level security;
alter table public.booking_slots enable row level security;
alter table public.booking_reservations enable row level security;
alter table public.booking_reservation_status_logs enable row level security;

drop policy if exists "Tenant managers can manage booking services" on public.booking_services;
create policy "Tenant managers can manage booking services"
on public.booking_services
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage booking service options" on public.booking_service_options;
create policy "Tenant managers can manage booking service options"
on public.booking_service_options
for all
to authenticated
using (
  exists (
    select 1
    from public.booking_services bs
    where bs.id = booking_service_options.booking_service_id
      and public.is_tenant_content_manager(bs.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.booking_services bs
    where bs.id = booking_service_options.booking_service_id
      and public.is_tenant_content_manager(bs.tenant_id)
  )
);

drop policy if exists "Tenant managers can manage booking slots" on public.booking_slots;
create policy "Tenant managers can manage booking slots"
on public.booking_slots
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage booking reservations" on public.booking_reservations;
create policy "Tenant managers can manage booking reservations"
on public.booking_reservations
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Tenant managers can manage booking reservation status logs" on public.booking_reservation_status_logs;
create policy "Tenant managers can manage booking reservation status logs"
on public.booking_reservation_status_logs
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));
