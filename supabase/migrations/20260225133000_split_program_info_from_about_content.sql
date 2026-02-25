alter table public.programs
add column if not exists coach_career jsonb not null default '[]'::jsonb;

update public.programs p
set coach_career = coalesce(
  (
    select ac.coach_career
    from public.about_content ac
    order by ac.created_at asc
    limit 1
  ),
  (
    select jsonb_agg(pc.content order by pc.order_index)
    from public.program_content pc
    where pc.program_id = p.id
      and pc.type = 'coach_career'
  ),
  '[]'::jsonb
)
where p.id = (
  select id
  from public.programs
  order by created_at asc
  limit 1
);

alter table public.about_content
drop column if exists team_name,
drop column if exists slogan,
drop column if exists description,
drop column if exists coach_name,
drop column if exists coach_instagram,
drop column if exists coach_career,
drop column if exists start_date,
drop column if exists end_date;
