create or replace function public.is_location_image_urls(value jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    case
      when jsonb_typeof(value) <> 'array' then false
      else jsonb_array_length(value) <= 5
        and not exists (
          select 1
          from jsonb_array_elements(value) as item
          where jsonb_typeof(item) <> 'string'
            or char_length(trim(item #>> '{}')) = 0
        )
    end;
$$;

create or replace function public.is_location_amenities(value jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    case
      when jsonb_typeof(value) <> 'array' then false
      else jsonb_array_length(value) <= 30
        and not exists (
          select 1
          from jsonb_array_elements(value) as item
          where jsonb_typeof(item) <> 'object'
            or char_length(trim(coalesce(item ->> 'label', ''))) = 0
            or char_length(trim(coalesce(item ->> 'iconKey', ''))) = 0
            or coalesce(item ->> 'iconKey', '') not in (
              'dumbbell',
              'shower',
              'map-pin',
              'car',
              'wifi',
              'clock',
              'users',
              'ruler',
              'circle-dot'
            )
            or jsonb_typeof(coalesce(item -> 'description', '""'::jsonb)) <> 'string'
        )
    end;
$$;

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text not null,
  description text not null default '',
  image_urls jsonb not null default '[]'::jsonb,
  map_image_url text not null default '',
  amenities jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint locations_name_not_blank check (char_length(trim(name)) > 0),
  constraint locations_address_not_blank check (char_length(trim(address)) > 0),
  constraint locations_image_urls_valid check (public.is_location_image_urls(image_urls)),
  constraint locations_amenities_valid check (public.is_location_amenities(amenities))
);

create index if not exists idx_locations_tenant_sort
on public.locations(tenant_id, sort_order, updated_at desc);

create index if not exists idx_locations_public
on public.locations(tenant_id, sort_order, updated_at desc)
where is_published = true;

create or replace function public.touch_locations_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_locations_updated_at on public.locations;
create trigger trg_locations_updated_at
before update on public.locations
for each row
execute function public.touch_locations_updated_at();

alter table public.locations enable row level security;

drop policy if exists "Public can read published locations" on public.locations;
create policy "Public can read published locations"
on public.locations
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Tenant managers can manage locations" on public.locations;
create policy "Tenant managers can manage locations"
on public.locations
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

grant select on public.locations to anon, authenticated;
grant insert, update, delete on public.locations to authenticated;
