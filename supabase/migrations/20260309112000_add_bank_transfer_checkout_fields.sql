alter table if exists public.tenant_branding
add column if not exists bank_name text not null default '';

alter table if exists public.tenant_branding
add column if not exists bank_account_number text not null default '';

alter table if exists public.tenant_branding
add column if not exists bank_account_holder text not null default '';

alter table if exists public.tenant_branding
add column if not exists bank_deposit_guide text not null default '';

alter table if exists public.program_orders
add column if not exists payment_method text;

alter table if exists public.program_orders
add column if not exists buyer_name text;

alter table if exists public.program_orders
add column if not exists buyer_email text;

alter table if exists public.program_orders
add column if not exists buyer_phone text;

alter table if exists public.program_orders
add column if not exists depositor_name text;

alter table if exists public.program_orders
drop constraint if exists program_orders_payment_method_check;

alter table if exists public.program_orders
add constraint program_orders_payment_method_check
check (
  payment_method is null
  or payment_method in ('toss_card', 'toss_subscription', 'bank_transfer')
);

update public.program_orders
set payment_method = case
  when provider = 'toss' then 'toss_card'
  else payment_method
end
where payment_method is null;
