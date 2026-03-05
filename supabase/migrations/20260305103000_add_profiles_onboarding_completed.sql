do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_completed'
  ) then
    alter table public.profiles
    add column onboarding_completed boolean;

    update public.profiles
    set onboarding_completed = true
    where onboarding_completed is distinct from true;

    alter table public.profiles
    alter column onboarding_completed set default false;

    alter table public.profiles
    alter column onboarding_completed set not null;
  end if;
end
$$;
