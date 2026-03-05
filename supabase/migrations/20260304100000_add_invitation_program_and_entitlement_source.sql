alter table public.tenant_invitations
add column if not exists program_id uuid references public.programs(id) on delete set null;

create index if not exists idx_tenant_invitations_program_id on public.tenant_invitations(program_id);

alter table public.program_entitlements
add column if not exists source_invitation_id uuid references public.tenant_invitations(id) on delete set null;

alter table public.program_entitlements
alter column source_order_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_entitlements_source_check'
  ) then
    alter table public.program_entitlements
    add constraint program_entitlements_source_check
    check (
      (source_order_id is not null and source_invitation_id is null)
      or (source_order_id is null and source_invitation_id is not null)
    );
  end if;
end
$$;

create unique index if not exists uq_program_entitlements_source_invitation_id
on public.program_entitlements(source_invitation_id)
where source_invitation_id is not null;
