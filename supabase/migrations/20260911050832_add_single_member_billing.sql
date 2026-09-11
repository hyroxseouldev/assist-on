-- Billing-only quantity cap. Program access and workout history are unchanged.
-- Existing table RLS/grants protect this setting from direct client writes.
alter table public.billing_settings
  add column single_member_program_ids uuid[] not null default '{}';
