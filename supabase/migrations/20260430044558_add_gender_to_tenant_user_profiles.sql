alter table public.tenant_user_profiles
add column if not exists gender text;

alter table public.tenant_user_profiles
drop constraint if exists tenant_user_profiles_gender_check;

alter table public.tenant_user_profiles
add constraint tenant_user_profiles_gender_check
check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say'));

update public.tenant_user_profiles tup
set gender = p.gender
from public.profiles p
where p.id = tup.user_id
  and tup.gender is distinct from p.gender;
