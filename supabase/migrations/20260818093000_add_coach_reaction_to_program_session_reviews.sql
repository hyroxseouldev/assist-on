alter table public.program_session_reviews
add column if not exists coach_reaction text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_session_reviews_coach_reaction_check'
      and conrelid = 'public.program_session_reviews'::regclass
  ) then
    alter table public.program_session_reviews
    add constraint program_session_reviews_coach_reaction_check
    check (
      coach_reaction is null
      or coach_reaction in ('good', 'great', 'excellent', 'consistent', 'needs_recovery')
    );
  end if;
end $$;
