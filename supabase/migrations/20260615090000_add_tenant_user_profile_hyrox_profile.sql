alter table public.tenant_user_profiles
add column if not exists hyrox_profile jsonb not null default '{}'::jsonb;

alter table public.tenant_user_profiles
drop constraint if exists tenant_user_profiles_hyrox_profile_object_check;

alter table public.tenant_user_profiles
add constraint tenant_user_profiles_hyrox_profile_object_check
check (jsonb_typeof(hyrox_profile) = 'object');
