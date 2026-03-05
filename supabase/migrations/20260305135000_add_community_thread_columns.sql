alter table public.community_posts
add column if not exists parent_post_id uuid references public.community_posts(id) on delete cascade,
add column if not exists post_type text not null default 'post';

update public.community_posts
set post_type = case when parent_post_id is null then 'post' else 'reply' end
where post_type is null
   or post_type not in ('post', 'reply');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_post_type_check'
  ) then
    alter table public.community_posts
    add constraint community_posts_post_type_check
    check (post_type in ('post', 'reply'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_parent_post_consistency_check'
  ) then
    alter table public.community_posts
    add constraint community_posts_parent_post_consistency_check
    check (
      (post_type = 'post' and parent_post_id is null)
      or (post_type = 'reply' and parent_post_id is not null)
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'community_posts_parent_not_self_check'
  ) then
    alter table public.community_posts
    add constraint community_posts_parent_not_self_check
    check (parent_post_id is null or parent_post_id <> id);
  end if;
end
$$;

create index if not exists idx_community_posts_tenant_parent_created_at
on public.community_posts (tenant_id, parent_post_id, created_at asc);

create index if not exists idx_community_posts_tenant_type_status_created_at
on public.community_posts (tenant_id, post_type, status, created_at desc);
