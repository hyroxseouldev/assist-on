"use client";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

type OfflineClassesListProps = {
  classes: OfflineClassWithParticipants[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(offlineClass: OfflineClassWithParticipants) {
  const now = Date.now();
  const startsAt = new Date(offlineClass.starts_at).getTime();

  if (now >= startsAt) {
    return "진행/종료";
  }

  if (offlineClass.participants.length >= offlineClass.capacity) {
    return "정원마감";
  }

  return "신청가능";
}

export function OfflineClassesList({ classes }: OfflineClassesListProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const offlineClassesPath = `${tenantBasePath}/admin/offline-classes`;
  const offlineClassesCreatePath = `${offlineClassesPath}/new`;

  if (classes.length === 0) {
    return <p className="text-sm text-zinc-500">등록된 오프라인 클래스가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => router.push(offlineClassesCreatePath)}>새 클래스 등록</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">제목</th>
              <th className="px-3 py-2 text-left font-medium">일정</th>
              <th className="px-3 py-2 text-left font-medium">장소</th>
              <th className="px-3 py-2 text-left font-medium">참가</th>
              <th className="px-3 py-2 text-left font-medium">상태</th>
              <th className="px-3 py-2 text-left font-medium">공개</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((offlineClass) => (
              <tr
                key={offlineClass.id}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => router.push(`${offlineClassesPath}/${offlineClass.id}`)}
              >
                <td className="px-3 py-2 font-medium text-zinc-900">{offlineClass.title}</td>
                <td className="px-3 py-2 text-zinc-700">
                  {formatDateTime(offlineClass.starts_at)} - {formatDateTime(offlineClass.ends_at)}
                </td>
                <td className="px-3 py-2 text-zinc-700">{offlineClass.location_text}</td>
                <td className="px-3 py-2 text-zinc-700">
                  {offlineClass.participants.length}/{offlineClass.capacity}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{getStatusLabel(offlineClass)}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={offlineClass.is_published ? "default" : "secondary"}>
                    {offlineClass.is_published ? "공개" : "비공개"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
