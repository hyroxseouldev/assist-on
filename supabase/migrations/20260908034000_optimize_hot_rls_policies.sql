-- Evaluate auth.uid() once per statement instead of once per scanned row on
-- the highest-traffic tables reported by the Supabase performance advisor.
do $migration$
declare
  policy_row record;
  optimized_qual text;
  optimized_with_check text;
begin
  for policy_row in
    select policies.schemaname, policies.tablename, policies.policyname, policies.qual, policies.with_check
    from pg_policies as policies
    join (
      values
        ('coach_profiles', 'Coach can update own profile'),
        ('coach_profiles', 'Tenant members can read coach profiles'),
        ('notifications', 'Users can read own notifications'),
        ('notifications', 'Users can update own notifications'),
        ('offline_class_registrations', 'Tenant members can read published class participants'),
        ('offline_classes', 'Tenant members can read published offline classes'),
        ('profiles', 'Users can insert own profile'),
        ('profiles', 'Users can read own profile'),
        ('profiles', 'Users can update own profile'),
        ('program_entitlements', 'Users can create own paid entitlements'),
        ('program_entitlements', 'Users can read own entitlements'),
        ('program_session_reviews', 'Tenant managers can read program session reviews'),
        ('program_session_reviews', 'Tenant managers can review program session reviews'),
        ('program_session_reviews', 'Users can create own program session reviews'),
        ('program_session_reviews', 'Users can read own program session reviews'),
        ('program_session_reviews', 'Users can update own submitted program session reviews'),
        ('programs', 'Admins can manage programs'),
        ('tenant_memberships', 'Owners can manage tenant memberships'),
        ('tenant_memberships', 'Users can read own tenant memberships'),
        ('tenant_user_profiles', 'Tenant members can read tenant user profiles'),
        ('tenant_user_profiles', 'Users can create own tenant_user_profiles'),
        ('tenant_user_profiles', 'Users can manage own tenant user profile'),
        ('tenant_user_profiles', 'Users can read own tenant_user_profiles'),
        ('tenant_user_profiles', 'Users can update own tenant_user_profiles'),
        ('tenants', 'Platform admins can manage tenants')
    ) as targets(tablename, policyname)
      on targets.tablename = policies.tablename
     and targets.policyname = policies.policyname
    where policies.schemaname = 'public'
  loop
    optimized_qual := case
      when policy_row.qual is null then null
      else replace(policy_row.qual, 'auth.uid()', '(select auth.uid())')
    end;
    optimized_with_check := case
      when policy_row.with_check is null then null
      else replace(policy_row.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    execute format(
      'alter policy %I on %I.%I%s%s',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename,
      case when optimized_qual is null then '' else format(' using (%s)', optimized_qual) end,
      case when optimized_with_check is null then '' else format(' with check (%s)', optimized_with_check) end
    );
  end loop;
end;
$migration$;

-- These two indexes have identical definitions. Keeping the more descriptive
-- name avoids duplicate write and storage overhead.
drop index if exists public.idx_program_session_reviews_tenant_session;
