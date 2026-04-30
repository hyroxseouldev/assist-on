create or replace function public.find_tenant_user_candidate_by_email(p_tenant_id uuid, p_email text)
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  already_member boolean
)
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Member'
    ) as full_name,
    nullif(
      coalesce(
        nullif(trim(p.avatar_url), ''),
        nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
      ),
      ''
    ) as avatar_url,
    exists (
      select 1
      from public.tenant_memberships tm
      where tm.tenant_id = p_tenant_id
        and tm.user_id = u.id
    ) as already_member
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    public.is_admin(auth.uid())
    or exists (
      select 1
      from public.tenant_memberships manager_membership
      where manager_membership.tenant_id = p_tenant_id
        and manager_membership.user_id = auth.uid()
        and manager_membership.role = 'owner'
    )
  )
    and lower(trim(coalesce(u.email, ''))) = lower(trim(coalesce(p_email, '')))
  limit 1;
$$;

revoke all on function public.find_tenant_user_candidate_by_email(uuid, text) from public;
grant execute on function public.find_tenant_user_candidate_by_email(uuid, text) to authenticated;
