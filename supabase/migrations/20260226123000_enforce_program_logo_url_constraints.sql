update public.programs
set logo_url = ''
where logo_url is null;

alter table public.programs
alter column logo_url set default '';

alter table public.programs
alter column logo_url set not null;
