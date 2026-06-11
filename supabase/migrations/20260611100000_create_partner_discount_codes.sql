create table if not exists public.partner_discount_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  brand_name text not null,
  brand_logo_url text not null default '',
  title text not null,
  description text not null default '',
  terms_text text not null default '',
  use_url text not null,
  code_text text not null,
  visibility_scope text not null default 'all_members',
  program_id uuid null references public.programs(id) on delete cascade,
  mobile_visibility text not null default 'private',
  is_active boolean not null default true,
  display_order integer not null default 0,
  starts_at timestamptz null,
  ends_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_discount_codes_brand_name_check check (length(btrim(brand_name)) > 0),
  constraint partner_discount_codes_title_check check (length(btrim(title)) > 0),
  constraint partner_discount_codes_code_text_check check (length(btrim(code_text)) > 0),
  constraint partner_discount_codes_use_url_check check (use_url ~* '^https?://'),
  constraint partner_discount_codes_visibility_scope_check check (visibility_scope in ('all_members', 'program_members')),
  constraint partner_discount_codes_program_scope_check check (
    (visibility_scope = 'all_members' and program_id is null)
    or (visibility_scope = 'program_members' and program_id is not null)
  ),
  constraint partner_discount_codes_mobile_visibility_check check (mobile_visibility in ('public', 'private')),
  constraint partner_discount_codes_date_range_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists idx_partner_discount_codes_tenant_status
on public.partner_discount_codes(tenant_id, is_active, mobile_visibility);

create index if not exists idx_partner_discount_codes_program_id
on public.partner_discount_codes(program_id);

create index if not exists idx_partner_discount_codes_created_by
on public.partner_discount_codes(created_by);

create index if not exists idx_partner_discount_codes_updated_by
on public.partner_discount_codes(updated_by);

create index if not exists idx_partner_discount_codes_display
on public.partner_discount_codes(tenant_id, display_order, created_at desc);

drop trigger if exists trg_partner_discount_codes_updated_at on public.partner_discount_codes;
create trigger trg_partner_discount_codes_updated_at
before update on public.partner_discount_codes
for each row
execute function public.touch_program_store_updated_at();

alter table public.partner_discount_codes enable row level security;

drop policy if exists "Tenant managers can manage partner discount codes" on public.partner_discount_codes;
create policy "Tenant managers can manage partner discount codes"
on public.partner_discount_codes
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id))
with check (public.is_tenant_content_manager(tenant_id));

drop policy if exists "Members can read visible partner discount codes" on public.partner_discount_codes;
create policy "Members can read visible partner discount codes"
on public.partner_discount_codes
for select
to authenticated
using (
  is_active = true
  and mobile_visibility = 'public'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
  and exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = partner_discount_codes.tenant_id
      and tm.user_id = (select auth.uid())
  )
  and (
    visibility_scope = 'all_members'
    or (
      visibility_scope = 'program_members'
      and exists (
        select 1
        from public.program_entitlements pe
        where pe.tenant_id = partner_discount_codes.tenant_id
          and pe.program_id = partner_discount_codes.program_id
          and pe.user_id = (select auth.uid())
          and pe.is_active = true
          and pe.starts_at <= now()
          and (pe.ends_at is null or pe.ends_at > now())
      )
    )
  )
);

grant select, insert, update, delete on public.partner_discount_codes to authenticated;
