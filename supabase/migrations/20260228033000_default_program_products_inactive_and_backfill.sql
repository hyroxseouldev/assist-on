alter table if exists public.program_products
  alter column is_active set default false;

insert into public.program_products (tenant_id, program_id, price_krw, is_active)
select p.tenant_id, p.id, 99000, false
from public.programs p
where p.tenant_id is not null
  and not exists (
    select 1
    from public.program_products pp
    where pp.tenant_id = p.tenant_id
      and pp.program_id = p.id
  );
