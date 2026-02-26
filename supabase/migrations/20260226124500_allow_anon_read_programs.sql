drop policy if exists "Public can read programs" on public.programs;

create policy "Public can read programs"
on public.programs
for select
to anon
using (true);
