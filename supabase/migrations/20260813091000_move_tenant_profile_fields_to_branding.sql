alter table if exists public.tenant_branding
  add column if not exists banner_image_url text not null default '',
  add column if not exists instagram text not null default '';

update public.tenant_branding tb
set
  banner_image_url = coalesce(nullif(tb.banner_image_url, ''), nullif(t.banner_image_url, ''), ''),
  instagram = coalesce(nullif(tb.instagram, ''), nullif(t.instagram, ''), ''),
  description = coalesce(nullif(tb.description, ''), nullif(t.description, ''), '')
from public.tenants t
where tb.tenant_id = t.id
  and (
    coalesce(t.banner_image_url, '') <> ''
    or coalesce(t.instagram, '') <> ''
    or coalesce(t.description, '') <> ''
  );

alter table if exists public.tenants
  drop column if exists banner_image_url,
  drop column if exists instagram,
  drop column if exists description;
