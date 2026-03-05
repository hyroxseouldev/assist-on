alter table public.community_posts
add column if not exists images jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_images_is_array_check'
  ) then
    alter table public.community_posts
    add constraint community_posts_images_is_array_check
    check (jsonb_typeof(images) = 'array');
  end if;
end
$$;

create index if not exists idx_community_posts_tenant_status_created_at
on public.community_posts (tenant_id, status, created_at desc);
