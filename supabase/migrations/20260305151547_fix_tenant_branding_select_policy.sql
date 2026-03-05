create or replace function public.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_tenant_member(uuid) to authenticated;

drop policy if exists "Tenant members can read tenant branding" on public.tenant_branding;

create policy "Tenant members can read tenant branding"
on public.tenant_branding
for select
to authenticated
using (
  public.is_tenant_member(tenant_id)
  or public.is_tenant_content_manager(tenant_id)
);
