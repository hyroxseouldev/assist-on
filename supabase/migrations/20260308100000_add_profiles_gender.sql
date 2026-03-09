alter table if exists public.profiles
add column if not exists gender text;

alter table if exists public.profiles
drop constraint if exists profiles_gender_check;

alter table if exists public.profiles
add constraint profiles_gender_check
check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say'));
