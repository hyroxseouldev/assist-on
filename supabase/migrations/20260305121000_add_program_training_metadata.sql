alter table public.programs
add column if not exists difficulty text not null default 'intermediate',
add column if not exists daily_workout_minutes integer not null default 60,
add column if not exists days_per_week integer not null default 5;

update public.programs
set
  difficulty = coalesce(nullif(difficulty, ''), 'intermediate'),
  daily_workout_minutes = coalesce(daily_workout_minutes, 60),
  days_per_week = coalesce(days_per_week, 5);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_difficulty_check'
  ) then
    alter table public.programs
    add constraint programs_difficulty_check
    check (difficulty in ('beginner', 'intermediate', 'advanced'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_daily_workout_minutes_check'
  ) then
    alter table public.programs
    add constraint programs_daily_workout_minutes_check
    check (daily_workout_minutes between 10 and 300);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'programs_days_per_week_check'
  ) then
    alter table public.programs
    add constraint programs_days_per_week_check
    check (days_per_week between 1 and 7);
  end if;
end
$$;
