-- Keep only one active push token per tenant/user/app/platform and record token-level push attempts.

update public.push_notification_tokens ranked
set enabled = false
from (
  select
    id,
    row_number() over (
      partition by tenant_id, user_id, app_id, platform
      order by last_seen_at desc, updated_at desc, created_at desc, id desc
    ) as active_rank
  from public.push_notification_tokens
  where enabled = true
) duplicates
where ranked.id = duplicates.id
  and duplicates.active_rank > 1;

create unique index if not exists push_notification_tokens_one_active_context
on public.push_notification_tokens (tenant_id, user_id, app_id, platform)
where enabled = true;

create or replace function public.keep_single_active_push_notification_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.enabled = true then
    update public.push_notification_tokens
    set enabled = false
    where tenant_id = new.tenant_id
      and user_id = new.user_id
      and app_id = new.app_id
      and platform = new.platform
      and enabled = true
      and id <> new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists keep_single_active_push_notification_token on public.push_notification_tokens;
create trigger keep_single_active_push_notification_token
before insert or update of tenant_id, user_id, app_id, platform, enabled
on public.push_notification_tokens
for each row
execute function public.keep_single_active_push_notification_token();

revoke execute on function public.keep_single_active_push_notification_token() from public, anon, authenticated;

create table if not exists public.push_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_log_id uuid null references public.push_notification_delivery_logs(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  push_token_id uuid null references public.push_notification_tokens(id) on delete set null,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  platform text null,
  app_id text null,
  token_prefix text not null,
  success boolean not null,
  error_code text null,
  error_message text null,
  disabled_token boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists push_notification_delivery_attempts_delivery_log_id_idx
on public.push_notification_delivery_attempts (delivery_log_id);

create index if not exists push_notification_delivery_attempts_notification_id_idx
on public.push_notification_delivery_attempts (notification_id);

create index if not exists push_notification_delivery_attempts_push_token_id_idx
on public.push_notification_delivery_attempts (push_token_id);

create index if not exists push_notification_delivery_attempts_recipient_created_idx
on public.push_notification_delivery_attempts (recipient_user_id, created_at desc);

alter table public.push_notification_delivery_attempts enable row level security;

drop policy if exists "Users can read own push notification delivery attempts" on public.push_notification_delivery_attempts;
create policy "Users can read own push notification delivery attempts"
on public.push_notification_delivery_attempts
for select
to authenticated
using ((select auth.uid()) = recipient_user_id);

grant select on public.push_notification_delivery_attempts to authenticated;
