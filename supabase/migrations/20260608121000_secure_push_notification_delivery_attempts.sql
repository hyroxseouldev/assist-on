revoke execute on function public.keep_single_active_push_notification_token() from public, anon, authenticated;

create index if not exists push_notification_delivery_attempts_delivery_log_id_idx
on public.push_notification_delivery_attempts (delivery_log_id);

create index if not exists push_notification_delivery_attempts_notification_id_idx
on public.push_notification_delivery_attempts (notification_id);

create index if not exists push_notification_delivery_attempts_push_token_id_idx
on public.push_notification_delivery_attempts (push_token_id);

create index if not exists push_notification_delivery_attempts_recipient_created_idx
on public.push_notification_delivery_attempts (recipient_user_id, created_at desc);
