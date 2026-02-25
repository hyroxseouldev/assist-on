do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'touch_about_content_updated_at' and p.pronargs = 0
  ) then
    execute 'alter function public.touch_about_content_updated_at() set search_path = public, pg_temp';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_current_timestamp_updated_at' and p.pronargs = 0
  ) then
    execute 'alter function public.set_current_timestamp_updated_at() set search_path = public, pg_temp';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'touch_notices_updated_at' and p.pronargs = 0
  ) then
    execute 'alter function public.touch_notices_updated_at() set search_path = public, pg_temp';
  end if;
end
$$;
