alter table if exists public.program_products
add column if not exists sale_status text;

update public.program_products
set sale_status = case when is_active then 'active' else 'private' end
where sale_status is null;

update public.program_products
set sale_status = 'private'
where sale_status not in ('active', 'preparing', 'private');

update public.program_products
set is_active = (sale_status = 'active');

alter table if exists public.program_products
alter column sale_status set default 'private';

alter table if exists public.program_products
alter column sale_status set not null;

alter table if exists public.program_products
drop constraint if exists program_products_sale_status_check;

alter table if exists public.program_products
add constraint program_products_sale_status_check
check (sale_status in ('active', 'preparing', 'private'));

alter table if exists public.program_products
drop constraint if exists program_products_sale_status_active_sync_check;

alter table if exists public.program_products
add constraint program_products_sale_status_active_sync_check
check (
  (sale_status = 'active' and is_active = true)
  or (sale_status in ('preparing', 'private') and is_active = false)
);

drop policy if exists "Public can read active program products" on public.program_products;
create policy "Public can read active program products"
on public.program_products
for select
to anon, authenticated
using (sale_status in ('active', 'preparing'));

drop policy if exists "Users can create own pending program orders" on public.program_orders;
create policy "Users can create own pending program orders"
on public.program_orders
for insert
to authenticated
with check (
  buyer_user_id = auth.uid()
  and exists (
    select 1
    from public.program_products pp
    where pp.id = product_id
      and pp.tenant_id = program_orders.tenant_id
      and pp.sale_status = 'active'
  )
);
