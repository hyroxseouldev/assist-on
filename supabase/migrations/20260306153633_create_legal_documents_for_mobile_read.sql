create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null,
  locale text not null,
  title text not null default '',
  content_html text not null default '',
  version text not null default 'v1.0.0',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_documents_type_check check (type in ('terms_of_service', 'privacy_policy')),
  constraint legal_documents_locale_check check (locale in ('ko', 'en'))
);

create index if not exists idx_legal_documents_lookup_latest
on public.legal_documents (
  tenant_id,
  type,
  locale,
  is_published,
  published_at desc,
  updated_at desc
);

create unique index if not exists uq_legal_documents_single_published_per_scope
on public.legal_documents (tenant_id, type, locale)
where is_published = true;

create or replace function public.touch_legal_documents_write_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();

  if new.is_published = true and new.published_at is null then
    new.published_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_legal_documents_write_fields on public.legal_documents;
create trigger trg_legal_documents_write_fields
before insert or update on public.legal_documents
for each row
execute function public.touch_legal_documents_write_fields();

alter table public.legal_documents enable row level security;

drop policy if exists "Tenant members can read published legal documents" on public.legal_documents;
create policy "Tenant members can read published legal documents"
on public.legal_documents
for select
to authenticated
using (
  (
    is_published = true
    and public.is_tenant_member(tenant_id)
  )
  or public.is_tenant_content_manager(tenant_id, auth.uid())
);

drop policy if exists "Tenant managers can manage legal documents" on public.legal_documents;
create policy "Tenant managers can manage legal documents"
on public.legal_documents
for all
to authenticated
using (public.is_tenant_content_manager(tenant_id, auth.uid()))
with check (public.is_tenant_content_manager(tenant_id, auth.uid()));

with base_tenant as (
  select id
  from public.tenants
  where slug = 'assist-on'
  limit 1
)
insert into public.legal_documents (
  tenant_id,
  type,
  locale,
  title,
  content_html,
  version,
  is_published,
  published_at
)
select
  bt.id,
  doc.type,
  doc.locale,
  doc.title,
  doc.content_html,
  doc.version,
  true,
  now()
from base_tenant bt
cross join (
  values
    (
      'terms_of_service',
      'ko',
      '이용약관',
      '<h2>제1조 (목적)</h2><p>본 약관은 Assist On(이하 "서비스")이 제공하는 온라인 서비스의 이용과 관련하여 서비스와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p><h2>제2조 (정의)</h2><p>"이용자"란 본 약관에 따라 서비스가 제공하는 기능을 이용하는 회원 및 비회원을 의미합니다.</p><h2>제3조 (약관의 효력 및 변경)</h2><p>서비스는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 사전에 공지합니다.</p><h2>제4조 (서비스의 제공 및 변경)</h2><p>서비스는 운동 프로그램 조회, 콘텐츠 열람, 기타 부가 기능을 제공하며 운영상 필요에 따라 기능의 전부 또는 일부를 변경할 수 있습니다.</p><h2>제5조 (이용자의 의무)</h2><p>이용자는 관계 법령, 본 약관, 이용안내 및 서비스가 공지한 사항을 준수해야 하며, 타인의 권리를 침해하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다.</p><h2>제6조 (면책)</h2><p>서비스는 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 제공 불가에 대하여 책임을 지지 않습니다.</p><h2>제7조 (문의)</h2><p>서비스 이용 관련 문의는 고객지원 채널을 통해 접수할 수 있습니다.</p>',
      'v1.0.0'
    ),
    (
      'privacy_policy',
      'ko',
      '개인정보처리방침',
      '<h2>1. 수집하는 개인정보 항목</h2><p>서비스는 회원 식별 및 서비스 제공을 위해 이름, 이메일, 서비스 이용기록 등 최소한의 개인정보를 수집할 수 있습니다.</p><h2>2. 개인정보의 수집 및 이용 목적</h2><p>수집한 개인정보는 회원 관리, 서비스 제공, 고객 문의 대응, 서비스 개선 및 통계 분석을 위해 이용됩니다.</p><h2>3. 개인정보의 보유 및 이용 기간</h2><p>개인정보는 수집 및 이용 목적 달성 시까지 보관하며, 관련 법령에서 보존기간을 정한 경우 해당 기간 동안 보관 후 지체 없이 파기합니다.</p><h2>4. 개인정보의 제3자 제공</h2><p>서비스는 이용자의 동의가 있거나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p><h2>5. 개인정보 처리 위탁</h2><p>서비스 운영을 위해 필요한 경우 개인정보 처리 업무를 외부 전문업체에 위탁할 수 있으며, 관련 사항은 법령에 따라 공개합니다.</p><h2>6. 이용자의 권리와 행사 방법</h2><p>이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있으며 관련 법령이 정한 절차에 따라 처리됩니다.</p><h2>7. 개인정보 보호책임자 및 문의처</h2><p>개인정보 보호 관련 문의는 고객지원 채널을 통해 접수할 수 있으며, 서비스는 신속하게 답변 드립니다.</p>',
      'v1.0.0'
    )
) as doc(type, locale, title, content_html, version)
where not exists (
  select 1
  from public.legal_documents ld
  where ld.tenant_id = bt.id
    and ld.type = doc.type
    and ld.locale = doc.locale
    and ld.version = doc.version
);
