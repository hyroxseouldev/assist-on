create or replace function public.save_billing_program_selection(
  p_tenant_id uuid, p_actor_id uuid, p_month text,
  p_included_ids uuid[], p_excluded_ids uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not coalesce(public.is_admin(p_actor_id), false) then
    raise exception '플랫폼 관리자만 청구 프로그램을 설정할 수 있습니다.' using errcode='42501';
  end if;
  if p_month is null or p_month !~ '^\d{4}-(0[1-9]|1[0-2])$'
    or p_included_ids is null or p_excluded_ids is null
    or cardinality(p_included_ids) + cardinality(p_excluded_ids) > 2000
    or p_included_ids && p_excluded_ids then
    raise exception '청구월과 프로그램 선택을 확인해 주세요.';
  end if;
  if exists (
    select 1 from unnest(p_included_ids || p_excluded_ids) selected(id)
    where selected.id is null or not exists (
      select 1 from public.programs p where p.id=selected.id and p.tenant_id=p_tenant_id
    )
  ) then raise exception '해당 고객사의 프로그램만 선택할 수 있습니다.'; end if;
  insert into public.billing_settings(tenant_id) values(p_tenant_id) on conflict do nothing;
  perform 1 from public.billing_settings where tenant_id=p_tenant_id for update;
  if exists(select 1 from public.billing_invoices where tenant_id=p_tenant_id and month=p_month) then
    raise exception '이미 확정된 청구월입니다.';
  end if;
  insert into public.billing_program_selections(tenant_id, month, included_program_ids, excluded_program_ids, updated_by)
  values(p_tenant_id, p_month,
    array(select distinct id from unnest(p_included_ids) id order by id),
    array(select distinct id from unnest(p_excluded_ids) id order by id), p_actor_id)
  on conflict (tenant_id,month) do update set
    included_program_ids=excluded.included_program_ids,
    excluded_program_ids=excluded.excluded_program_ids,
    updated_by=excluded.updated_by, updated_at=now();
end;
$$;
