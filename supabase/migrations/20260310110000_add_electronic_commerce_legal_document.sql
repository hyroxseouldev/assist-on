alter table public.legal_documents
drop constraint if exists legal_documents_type_check;

alter table public.legal_documents
add constraint legal_documents_type_check
check (type in ('terms_of_service', 'privacy_policy', 'electronic_commerce_terms'));

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
      'electronic_commerce_terms',
      'ko',
      '전자상거래 이용약관',
      '<h2>제1조 (목적)</h2><p>본 약관은 Assist On(이하 "회사")이 제공하는 온라인 상품 및 서비스의 전자상거래 결제, 주문, 환불 및 관련 절차에 관한 사항을 규정함을 목적으로 합니다.</p><h2>제2조 (주문 및 계약의 성립)</h2><p>이용자는 회사가 제공하는 결제 화면에서 상품 정보, 판매 금액, 결제 수단, 유의사항을 확인한 뒤 주문을 신청할 수 있습니다. 회사는 주문 접수 및 입금 확인 등 필요한 절차를 거쳐 주문을 승인하며, 그 시점에 계약이 성립합니다.</p><h2>제3조 (결제수단 및 입금 확인)</h2><p>이용자는 회사가 제공하는 결제수단을 통해 상품 대금을 지급할 수 있습니다. 무통장입금의 경우 주문자명과 실제 입금자명이 다를 수 있으므로, 회사는 입금 확인을 위해 추가 정보를 요청할 수 있습니다.</p><h2>제4조 (상품 제공 시점)</h2><p>디지털 상품 또는 프로그램 이용권은 결제 확인 후 회사의 운영 정책에 따라 순차적으로 제공됩니다. 시스템 점검, 승인 확인, 운영 일정 등에 따라 제공 시점이 다소 지연될 수 있습니다.</p><h2>제5조 (청약철회 및 환불)</h2><p>이용자는 관련 법령이 정하는 범위 내에서 청약철회 또는 환불을 요청할 수 있습니다. 다만 디지털 콘텐츠 특성상 결제 후 즉시 이용이 개시되었거나 일부 서비스가 제공된 경우에는 법령이 허용하는 범위에서 청약철회가 제한될 수 있습니다. 구체적인 환불 기준은 개별 상품 안내 또는 회사의 별도 정책에 따릅니다.</p><h2>제6조 (주문 취소 및 제한)</h2><p>이용자가 입력한 정보가 사실과 다르거나, 비정상적인 결제 시도, 타인 명의 도용, 운영 방해 행위가 확인되는 경우 회사는 주문을 보류하거나 취소할 수 있습니다.</p><h2>제7조 (책임 제한)</h2><p>회사는 천재지변, 통신 장애, 결제대행사 장애, 이용자 귀책 사유 등 불가항력적 또는 합리적으로 통제하기 어려운 사유로 발생한 손해에 대하여 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.</p><h2>제8조 (문의처)</h2><p>주문, 결제, 청약철회 및 환불 관련 문의는 회사가 안내하는 고객지원 채널을 통해 접수할 수 있습니다.</p>',
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
