alter table if exists public.tenant_branding
  add column if not exists brand_name text not null default '';

update public.tenant_branding
set brand_name = team_name
where coalesce(brand_name, '') = ''
  and coalesce(team_name, '') <> '';
