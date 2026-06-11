create index if not exists idx_offline_class_registrations_confirmed_by
on public.offline_class_registrations (confirmed_by);

create index if not exists idx_offline_class_registrations_reviewed_by
on public.offline_class_registrations (reviewed_by);
