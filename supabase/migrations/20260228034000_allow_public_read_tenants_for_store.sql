drop policy if exists "Public can read tenants" on public.tenants;

create policy "Public can read tenants"
on public.tenants
for select
to anon, authenticated
using (true);
