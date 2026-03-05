alter table if exists public.program_entitlements
add column if not exists source_granted_by uuid references auth.users(id) on delete set null;

alter table if exists public.program_entitlements
drop constraint if exists program_entitlements_source_check;

alter table if exists public.program_entitlements
add constraint program_entitlements_source_check
check (
  (
    (case when source_order_id is not null then 1 else 0 end)
    + (case when source_invitation_id is not null then 1 else 0 end)
    + (case when source_granted_by is not null then 1 else 0 end)
  ) = 1
);
