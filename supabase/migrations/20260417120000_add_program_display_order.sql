alter table public.programs
add column if not exists display_order integer not null default 0;

update public.programs
set display_order = 0
where display_order is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_display_order_check'
  ) then
    alter table public.programs
    add constraint programs_display_order_check
    check (display_order >= 0);
  end if;
end
$$;

create index if not exists idx_programs_tenant_display_order
on public.programs(tenant_id, display_order, created_at);
