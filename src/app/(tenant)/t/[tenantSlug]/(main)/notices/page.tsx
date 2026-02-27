import { NoticesList } from "@/components/notices/notices-list";
import { getPublishedNotices } from "@/lib/admin/server";

export default async function TenantNoticesPage() {
  const notices = await getPublishedNotices();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">공지사항</h1>
        <p className="mt-1 text-sm text-zinc-600">팀 운영 공지와 업데이트를 확인하세요.</p>
      </div>

      <NoticesList
        notices={notices}
        title="전체 공지"
        description="최신 순서로 모든 공개 공지를 보여줍니다."
        emptyMessage="등록된 공지사항이 없습니다."
        showDetailLink
      />
    </section>
  );
}
