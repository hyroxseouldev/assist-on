-- Lock legacy workout table writes after v2 migration.

drop policy if exists "Users can create own personal records" on public.user_personal_records;
drop policy if exists "Users can update own personal records" on public.user_personal_records;
drop policy if exists "Users can delete own personal records" on public.user_personal_records;

-- Keep read policy as-is for historical inspection.
