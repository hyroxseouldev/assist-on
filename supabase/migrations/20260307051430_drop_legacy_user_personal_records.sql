-- Remove deprecated legacy workout records table and guard helpers.

drop table if exists public.user_personal_records;

drop function if exists public.block_legacy_user_personal_records_write();
drop function if exists public.touch_user_personal_records_updated_at();
