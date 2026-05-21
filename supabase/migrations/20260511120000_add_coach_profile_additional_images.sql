alter table if exists public.coach_profiles
  add column if not exists additional_image_urls jsonb not null default '[]'::jsonb;

update public.coach_profiles
set additional_image_urls = '[]'::jsonb
where additional_image_urls is null;

alter table if exists public.coach_profiles
  drop constraint if exists coach_profiles_additional_image_urls_is_array,
  drop constraint if exists coach_profiles_additional_image_urls_max_six;

alter table if exists public.coach_profiles
  add constraint coach_profiles_additional_image_urls_is_array
    check (jsonb_typeof(additional_image_urls) = 'array'),
  add constraint coach_profiles_additional_image_urls_max_six
    check (jsonb_array_length(additional_image_urls) <= 6);
