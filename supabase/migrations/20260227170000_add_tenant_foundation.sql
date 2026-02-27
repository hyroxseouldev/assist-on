create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tenant_membership_role') then
    create type public.tenant_membership_role as enum ('owner', 'coach', 'member');
  end if;
end
$$;

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index if not exists idx_tenant_memberships_user_id on public.tenant_memberships(user_id);

create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text,
  role public.tenant_membership_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tenant_invitations_max_uses_positive check (max_uses > 0),
  constraint tenant_invitations_used_count_non_negative check (used_count >= 0)
);

create index if not exists idx_tenant_invitations_tenant_id on public.tenant_invitations(tenant_id);
create index if not exists idx_tenant_invitations_email on public.tenant_invitations(email);

alter table if exists public.profiles add column if not exists platform_role text;

update public.profiles
set platform_role = case when role = 'admin' then 'admin' else 'user' end
where platform_role is null;

alter table if exists public.profiles alter column platform_role set default 'user';

alter table if exists public.programs add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.about_content add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.sessions add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.notices add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.offline_classes add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.offline_class_registrations add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.community_posts add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.community_comments add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.community_post_likes add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.community_post_reports add column if not exists tenant_id uuid references public.tenants(id);

create index if not exists idx_programs_tenant_id on public.programs(tenant_id);
create index if not exists idx_about_content_tenant_id on public.about_content(tenant_id);
create index if not exists idx_sessions_tenant_id on public.sessions(tenant_id);
create index if not exists idx_notices_tenant_id on public.notices(tenant_id);
create index if not exists idx_offline_classes_tenant_id on public.offline_classes(tenant_id);
create index if not exists idx_offline_class_registrations_tenant_id on public.offline_class_registrations(tenant_id);
create index if not exists idx_community_posts_tenant_id on public.community_posts(tenant_id);
create index if not exists idx_community_comments_tenant_id on public.community_comments(tenant_id);
create index if not exists idx_community_post_likes_tenant_id on public.community_post_likes(tenant_id);
create index if not exists idx_community_post_reports_tenant_id on public.community_post_reports(tenant_id);

insert into public.tenants (slug, name)
values ('assist-on', 'Assist On')
on conflict (slug) do nothing;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.programs p
set tenant_id = bt.id
from base_tenant bt
where p.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.about_content a
set tenant_id = bt.id
from base_tenant bt
where a.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.sessions s
set tenant_id = bt.id
from base_tenant bt
where s.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.notices n
set tenant_id = bt.id
from base_tenant bt
where n.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.offline_classes c
set tenant_id = bt.id
from base_tenant bt
where c.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.offline_class_registrations r
set tenant_id = coalesce(c.tenant_id, bt.id)
from public.offline_classes c
cross join base_tenant bt
where r.class_id = c.id
  and r.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.community_posts p
set tenant_id = bt.id
from base_tenant bt
where p.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.community_comments c
set tenant_id = coalesce(p.tenant_id, bt.id)
from public.community_posts p
cross join base_tenant bt
where c.post_id = p.id
  and c.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.community_post_likes l
set tenant_id = coalesce(p.tenant_id, bt.id)
from public.community_posts p
cross join base_tenant bt
where l.post_id = p.id
  and l.tenant_id is null;

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
update public.community_post_reports r
set tenant_id = coalesce(p.tenant_id, bt.id)
from public.community_posts p
cross join base_tenant bt
where r.post_id = p.id
  and r.tenant_id is null;
