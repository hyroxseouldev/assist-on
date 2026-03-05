drop index if exists idx_community_posts_tenant_parent_created_at;
drop index if exists idx_community_posts_tenant_type_status_created_at;

alter table public.community_posts
drop constraint if exists community_posts_parent_not_self_check;

alter table public.community_posts
drop constraint if exists community_posts_parent_post_consistency_check;

alter table public.community_posts
drop constraint if exists community_posts_post_type_check;

alter table public.community_posts
drop column if exists parent_post_id,
drop column if exists post_type;
