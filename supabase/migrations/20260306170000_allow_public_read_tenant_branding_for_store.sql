drop policy if exists "Public can read tenant branding" on public.tenant_branding;

create policy "Public can read tenant branding"
on public.tenant_branding
for select
to anon, authenticated
using (true);
