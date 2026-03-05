alter table if exists public.program_orders
drop constraint if exists program_orders_product_id_fkey;

alter table if exists public.program_orders
alter column product_id drop not null;

alter table if exists public.program_orders
add constraint program_orders_product_id_fkey
foreign key (product_id)
references public.program_products(id)
on delete set null;
