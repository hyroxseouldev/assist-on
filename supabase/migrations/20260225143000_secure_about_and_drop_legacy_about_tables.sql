alter table public.about_content enable row level security;

drop policy if exists "Authenticated can read about_content" on public.about_content;
create policy "Authenticated can read about_content"
on public.about_content
for select
to authenticated
using (true);

drop policy if exists "Admins can manage about_content" on public.about_content;
create policy "Admins can manage about_content"
on public.about_content
for all
to authenticated
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

drop table if exists public.training_program_section_details;
drop table if exists public.training_program_sections;
drop table if exists public.program_content;
