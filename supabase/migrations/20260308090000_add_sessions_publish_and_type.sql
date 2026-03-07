alter table public.sessions
  add column if not exists is_published boolean not null default false;

alter table public.sessions
  add column if not exists publish_at timestamptz;

alter table public.sessions
  add column if not exists session_type text not null default 'training';

update public.sessions
set
  is_published = true,
  publish_at = coalesce(publish_at, now()),
  session_type = coalesce(nullif(trim(session_type), ''), 'training')
where is_published = false
   or publish_at is null
   or session_type is null
   or trim(session_type) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_session_type_check'
      and conrelid = 'public.sessions'::regclass
  ) then
    alter table public.sessions
      add constraint sessions_session_type_check
      check (session_type in ('training', 'rest'));
  end if;
end
$$;

create index if not exists idx_sessions_tenant_program_date
  on public.sessions (tenant_id, program_id, session_date);

create index if not exists idx_sessions_visibility
  on public.sessions (tenant_id, program_id, is_published, publish_at);
