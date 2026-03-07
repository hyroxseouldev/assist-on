drop policy if exists "Public can read published legal documents" on public.legal_documents;

create policy "Public can read published legal documents"
on public.legal_documents
for select
to anon, authenticated
using (is_published = true);

with source as (
  select tenant_id, type, version, coalesce(published_at, now()) as published_at
  from public.legal_documents
  where locale = 'en'
    and is_published = true
    and type in ('terms_of_service', 'privacy_policy')
),
translated as (
  select
    tenant_id,
    type,
    'ko'::text as locale,
    case
      when type = 'terms_of_service' then '이용약관'
      else '개인정보처리방침'
    end as title,
    case
      when type = 'terms_of_service' then '<h2>서비스 이용약관</h2><p>본 이용약관은 Xontraining 앱(이하 "앱") 및 관련 서비스(이하 "서비스")의 이용 조건과 절차, 이용자와 서비스 제공자의 권리·의무 및 책임사항을 규정합니다. 앱을 설치하거나 이용하는 즉시 본 약관에 동의한 것으로 봅니다.</p><h3>1. 이용자 준수사항</h3><p>이용자는 앱, 앱의 일부 기능, 상표, 로고, 콘텐츠를 무단으로 복제·수정·배포하거나, 소스코드를 추출·역분석·2차 저작물로 제작해서는 안 됩니다. 관련 지식재산권은 모두 서비스 제공자에게 있습니다.</p><h3>2. 서비스 변경 및 제공 중단</h3><p>서비스 제공자는 서비스 품질 개선을 위해 기능을 변경하거나 유료 정책을 도입할 수 있으며, 중요한 변경사항은 앱 또는 관련 채널을 통해 안내합니다. 또한 운영상 필요 시 서비스 제공을 종료할 수 있습니다.</p><h3>3. 기기 및 계정 보안</h3><p>이용자는 본인 단말기와 계정 접근 권한을 안전하게 관리해야 하며, 루팅/탈옥 등 보안 취약 상태에서의 이용으로 인한 문제는 이용자 책임이 될 수 있습니다.</p><h3>4. 네트워크 및 통신요금</h3><p>일부 기능은 인터넷 연결이 필요하며, 와이파이 또는 이동통신망 이용 중 발생하는 데이터/로밍 요금은 이용자가 부담합니다.</p><h3>5. 면책</h3><p>서비스 제공자는 앱의 정확성과 최신성을 유지하기 위해 노력하나, 외부 요인 또는 제3자 제공 정보로 인한 간접·부수적 손해에 대해 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.</p><h3>6. 약관 변경</h3><p>본 약관은 관련 법령 및 서비스 정책에 따라 개정될 수 있습니다. 개정 시 적용일과 주요 변경사항을 공지하며, 개정 후 서비스를 계속 이용하면 변경 약관에 동의한 것으로 간주됩니다.</p><h3>7. 문의처</h3><p>약관 관련 문의는 이메일 vividxxxxx@gmail.com 으로 접수할 수 있습니다.</p>'
      else '<h2>개인정보처리방침</h2><p>본 개인정보처리방침은 Xontraining 앱(이하 "앱") 이용 과정에서 수집되는 개인정보의 항목, 이용 목적, 보관 및 파기, 제3자 제공, 이용자 권리 등을 설명합니다.</p><h3>1. 수집하는 정보</h3><p>앱은 서비스 제공을 위해 다음 정보를 수집할 수 있습니다.</p><ul><li>기기 정보(IP 주소, OS, 접속 로그, 이용 기록)</li><li>서비스 이용 정보(방문 페이지, 이용 시간, 기능 사용 이력)</li><li>이용자가 직접 제공한 정보(예: 이메일, 이름)</li></ul><p>앱은 단말기의 정밀 위치정보를 수집하지 않습니다.</p><h3>2. 이용 목적</h3><p>수집한 정보는 회원 식별, 서비스 제공 및 운영, 공지 전달, 고객 문의 대응, 서비스 품질 개선, 통계 분석, 마케팅 안내(관련 법령이 허용하는 범위) 목적으로 사용됩니다.</p><h3>3. 제3자 제공 및 처리위탁</h3><p>서비스 제공자는 법령상 근거가 있거나 이용자 동의가 있는 경우를 제외하고 개인정보를 제3자에게 임의 제공하지 않습니다. 다만 서비스 운영을 위해 신뢰할 수 있는 수탁사에 업무를 위탁할 수 있으며, 이 경우 관련 법령을 준수합니다.</p><h3>4. 보유 및 파기</h3><p>개인정보는 수집 목적 달성 시까지 보관하며, 관계 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관 후 지체 없이 파기합니다. 삭제 요청은 vividxxxxx@gmail.com 으로 접수할 수 있습니다.</p><h3>5. 아동의 개인정보</h3><p>서비스 제공자는 만 13세 미만 아동의 개인정보를 고의로 수집하지 않으며, 관련 사실이 확인될 경우 필요한 조치를 신속히 시행합니다.</p><h3>6. 이용자 권리</h3><p>이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지 등을 요청할 수 있으며, 법령이 정한 절차에 따라 처리됩니다.</p><h3>7. 보안 조치</h3><p>서비스 제공자는 개인정보 보호를 위해 기술적·관리적·물리적 보호조치를 적용하고, 무단 접근·유출·변조·훼손 방지를 위해 노력합니다.</p><h3>8. 방침 변경</h3><p>본 방침은 정책 또는 법령 변경에 따라 개정될 수 있으며, 개정 시 적용일 및 주요 변경 내용을 공지합니다.</p><h3>9. 문의처</h3><p>개인정보 관련 문의는 vividxxxxx@gmail.com 으로 연락해 주세요.</p>'
    end as content_html,
    version,
    true as is_published,
    published_at
  from source
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
  t.tenant_id,
  t.type,
  t.locale,
  t.title,
  t.content_html,
  t.version,
  t.is_published,
  t.published_at
from translated t
where not exists (
  select 1
  from public.legal_documents ld
  where ld.tenant_id = t.tenant_id
    and ld.type = t.type
    and ld.locale = t.locale
    and ld.version = t.version
);
