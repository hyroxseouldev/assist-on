-- The function performs its own manager check and pins every relation to the
-- requested tenant. Running it as the migration owner avoids repeating table
-- RLS predicates for every entitlement/session/review row in the aggregate.
alter function public.get_admin_active_program_mission_participation(uuid, uuid[])
security definer;

revoke all on function public.get_admin_active_program_mission_participation(uuid, uuid[]) from public;
revoke all on function public.get_admin_active_program_mission_participation(uuid, uuid[]) from anon;
grant execute on function public.get_admin_active_program_mission_participation(uuid, uuid[]) to authenticated;
