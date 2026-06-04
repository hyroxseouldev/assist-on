"use client";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

type OfflineClassesListProps = {
  classes: OfflineClassWithParticipants[];
};

function getStatusLabel(status: OfflineClassWithParticipants["status"]) {
  if (status === "pre_open") {
    return "오픈 전";
  }
  if (status === "closed") {
    return "마감";
  }
  return "오픈";
}

export function OfflineClassesList({ classes }: OfflineClassesListProps) {
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const offlineClassesPath = `${tenantBasePath}/admin/offline-classes`;
  const offlineClassesCreatePath = `${offlineClassesPath}/new`;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => push(offlineClassesCreatePath)}>새 클래스 등록</Button>
      </div>

      {classes.length === 0 ? <p className="text-sm text-zinc-500">등록된 오프라인 클래스가 없습니다.</p> : null}

      {classes.length > 0 ? (
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">제목</th>
              <th className="px-3 py-2 text-left font-medium">일정</th>
              <th className="px-3 py-2 text-left font-medium">장소</th>
              <th className="px-3 py-2 text-left font-medium">코치</th>
              <th className="px-3 py-2 text-left font-medium">참가</th>
              <th className="px-3 py-2 text-left font-medium">상태</th>
              <th className="px-3 py-2 text-left font-medium">공개</th>
              <th className="px-3 py-2 text-left font-medium">모바일</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((offlineClass) => (
              <tr
                key={offlineClass.id}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => push(`${offlineClassesPath}/${offlineClass.id}`)}
              >
                <td className="px-3 py-2 font-medium text-zinc-900">{offlineClass.title}</td>
                <td className="px-3 py-2 text-zinc-700">
                  {formatAdminDateTime(offlineClass.starts_at)} - {formatAdminDateTime(offlineClass.ends_at)}
                </td>
                <td className="px-3 py-2 text-zinc-700">{offlineClass.location_text}</td>
                <td className="px-3 py-2 text-zinc-700">{offlineClass.coach_profile?.display_name ?? "-"}</td>
                <td className="px-3 py-2 text-zinc-700">
                  {offlineClass.participants.length}/{offlineClass.capacity}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={offlineClass.status === "open" ? "default" : "secondary"}>
                    {getStatusLabel(offlineClass.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={offlineClass.is_published ? "default" : "secondary"}>
                    {offlineClass.is_published ? "공개" : "비공개"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={offlineClass.mobile_visibility === "public" ? "outline" : "secondary"}>
                    {offlineClass.mobile_visibility === "public" ? "공개" : "비공개"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}
    </div>
  );
}
