drop policy if exists "Authenticated can read basic profiles" on public.profiles;

create policy "Authenticated can read basic profiles"
on public.profiles
for select
to authenticated
using (true);
