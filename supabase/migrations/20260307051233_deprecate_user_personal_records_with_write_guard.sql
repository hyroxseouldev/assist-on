-- Fully deprecate legacy personal records table for writes.

create or replace function public.block_legacy_user_personal_records_write()
returns trigger
language plpgsql
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = 'user_personal_records is deprecated. Write to user_workout_records_v2 instead.';
end;
$$;

drop trigger if exists trg_block_legacy_user_personal_records_write
  on public.user_personal_records;

create trigger trg_block_legacy_user_personal_records_write
before insert or update or delete
on public.user_personal_records
for each row
execute function public.block_legacy_user_personal_records_write();

comment on table public.user_personal_records is
  'DEPRECATED: read-only legacy table. New writes must go to public.user_workout_records_v2.';
