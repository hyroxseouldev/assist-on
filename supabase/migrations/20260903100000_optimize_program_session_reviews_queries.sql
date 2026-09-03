create index if not exists idx_sessions_tenant_session_date
  on public.sessions (tenant_id, session_date);

create index if not exists idx_program_session_reviews_tenant_session_created_at
  on public.program_session_reviews (tenant_id, session_id, created_at desc);
