-- The server already reads these fields through the Auth admin API.
-- Permit the same server role to join only these columns for paginated search.
-- Keep auth.users private: no anon/authenticated grant, no credential columns,
-- and the search RPC remains SECURITY INVOKER with its tenant/actor checks.
grant select (
  id, email, raw_user_meta_data, deleted_at, email_confirmed_at,
  invited_at, last_sign_in_at, created_at
) on auth.users to service_role;
