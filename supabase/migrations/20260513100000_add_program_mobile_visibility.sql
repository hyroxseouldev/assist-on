alter table public.programs
add column if not exists mobile_visibility text;

alter table public.programs
alter column mobile_visibility set default 'public';

update public.programs
set mobile_visibility = 'public'
where mobile_visibility is null;

alter table public.programs
alter column mobile_visibility set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_mobile_visibility_check'
  ) then
    alter table public.programs
    add constraint programs_mobile_visibility_check
    check (mobile_visibility in ('public', 'members_only', 'private'));
  end if;
end
$$;

create index if not exists idx_programs_tenant_mobile_visibility
on public.programs(tenant_id, mobile_visibility, display_order, created_at);
