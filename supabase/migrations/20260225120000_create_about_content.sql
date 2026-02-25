create table if not exists public.about_content (
  id uuid primary key default gen_random_uuid(),
  team_name text not null default '',
  slogan text not null default '',
  description text not null default '',
  coach_name text not null default '',
  coach_instagram text not null default '',
  motivation text not null default '',
  assist_meaning text not null default '',
  goal text not null default '',
  identity text not null default '',
  mindset_title text not null default '',
  mindset_statement text not null default '',
  start_date date not null default current_date,
  end_date date not null default current_date,
  core_messages jsonb not null default '[]'::jsonb,
  coach_career jsonb not null default '[]'::jsonb,
  philosophy_values jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  training_program jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_about_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_about_content_updated_at on public.about_content;
create trigger trg_about_content_updated_at
before update on public.about_content
for each row
execute function public.touch_about_content_updated_at();

insert into public.about_content (
  team_name,
  slogan,
  description,
  coach_name,
  coach_instagram,
  motivation,
  assist_meaning,
  goal,
  identity,
  mindset_title,
  mindset_statement,
  start_date,
  end_date,
  core_messages,
  coach_career,
  philosophy_values,
  benefits,
  training_program
)
select
  p.team_name,
  p.slogan,
  p.description,
  p.coach_name,
  p.coach_instagram,
  p.motivation,
  p.assist_meaning,
  p.goal,
  p.identity,
  p.mindset_title,
  p.mindset_statement,
  p.start_date,
  p.end_date,
  coalesce(
    (
      select jsonb_agg(pc.content order by pc.order_index)
      from public.program_content pc
      where pc.program_id = p.id
        and pc.type = 'core_message'
    ),
    '[]'::jsonb
  ) as core_messages,
  coalesce(
    (
      select jsonb_agg(pc.content order by pc.order_index)
      from public.program_content pc
      where pc.program_id = p.id
        and pc.type = 'coach_career'
    ),
    '[]'::jsonb
  ) as coach_career,
  coalesce(
    (
      select jsonb_agg(pc.content order by pc.order_index)
      from public.program_content pc
      where pc.program_id = p.id
        and pc.type = 'philosophy_value'
    ),
    '[]'::jsonb
  ) as philosophy_values,
  coalesce(
    (
      select jsonb_agg(pc.content order by pc.order_index)
      from public.program_content pc
      where pc.program_id = p.id
        and pc.type = 'benefit'
    ),
    '[]'::jsonb
  ) as benefits,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'title', s.title,
          'details', coalesce(
            (
              select jsonb_agg(d.detail order by d.order_index)
              from public.training_program_section_details d
              where d.section_id = s.id
            ),
            '[]'::jsonb
          )
        )
        order by s.order_index
      )
      from public.training_program_sections s
      where s.program_id = p.id
    ),
    '[]'::jsonb
  ) as training_program
from public.programs p
order by p.created_at asc
limit 1
on conflict do nothing;
