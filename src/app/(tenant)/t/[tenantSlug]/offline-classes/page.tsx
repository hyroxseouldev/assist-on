import { OfflineClassesList } from "@/components/offline-classes/offline-classes-list";
import { getPublishedOfflineClasses } from "@/lib/admin/server";

export default async function TenantOfflineClassesPage() {
  const { classes, currentUserId } = await getPublishedOfflineClasses();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">오프라인 클래스</h1>
        <p className="mt-1 text-sm text-zinc-600">장소와 시간을 확인하고 원하는 클래스에 신청하세요.</p>
      </div>

      <OfflineClassesList
        classes={classes}
        currentUserId={currentUserId}
        title="전체 클래스"
        description="진행 예정 클래스와 참가자 목록을 최신 순서로 확인할 수 있습니다."
        emptyMessage="등록된 오프라인 클래스가 없습니다."
        showDetailLink
      />
    </section>
  );
}
