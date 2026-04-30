alter table if exists public.programs
drop column if exists motivation,
drop column if exists assist_meaning,
drop column if exists goal,
drop column if exists identity,
drop column if exists mindset_title,
drop column if exists mindset_statement;
