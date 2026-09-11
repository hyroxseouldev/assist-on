-- A billing-only override; owners/managers must not change charges by editing
-- the operational preregistration roster. No automatic terms for other rosters.
create table public.billing_preregistration_terms (
  grant_id uuid primary key references public.entitlement_auto_grants(id),
  first_month text not null check (first_month ~ '^(20[0-9]{2}|21[0-9]{2}|2200)-(0[1-9]|1[0-2])$'),
  reason text not null check (length(btrim(reason)) between 1 and 300),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index billing_preregistration_terms_creator on public.billing_preregistration_terms(created_by);
alter table public.billing_preregistration_terms enable row level security;
revoke all on public.billing_preregistration_terms from public, anon, authenticated;
grant select on public.billing_preregistration_terms to authenticated;
grant all on public.billing_preregistration_terms to service_role;
create policy billing_preregistration_terms_read
  on public.billing_preregistration_terms for select to authenticated
  using (
    (select public.is_admin(auth.uid()))
    or exists (
      select 1 from public.entitlement_auto_grants g
      where g.id = grant_id and public.is_tenant_owner(g.tenant_id)
    )
  );
comment on table public.billing_preregistration_terms is
  'Explicit first billing month for a preregistration. Earlier access is waived, not carried as a late-join adjustment. Does not grant program access.';
