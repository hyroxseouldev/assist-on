"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { NoticeRow } from "@/lib/admin/types";

type NoticesListProps = {
  notices: NoticeRow[];
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

export function NoticesList({ notices }: NoticesListProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const noticesPath = `${tenantBasePath}/admin/notices`;
  const noticeCreatePath = `${noticesPath}/new`;

  if (notices.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => router.push(noticeCreatePath)}>새 공지 등록</Button>
        </div>
        <p className="text-sm text-zinc-500">등록된 공지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => router.push(noticeCreatePath)}>새 공지 등록</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">대표 이미지</th>
              <th className="px-3 py-2 text-left font-medium">제목</th>
              <th className="px-3 py-2 text-left font-medium">공개</th>
              <th className="px-3 py-2 text-left font-medium">생성일</th>
              <th className="px-3 py-2 text-left font-medium">수정일</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((notice) => (
              <tr
                key={notice.id}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => router.push(`${noticesPath}/${notice.id}`)}
              >
                <td className="px-3 py-2">
                  <div className="relative size-12 overflow-hidden rounded-md border border-zinc-200 bg-white">
                    <Image
                      src={notice.thumbnail_url || "/xon_logo.jpg"}
                      alt={`${notice.title} 대표 이미지`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900">{notice.title}</td>
                <td className="px-3 py-2">
                  <Badge variant={notice.is_published ? "default" : "secondary"}>
                    {notice.is_published ? "공개" : "비공개"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-zinc-700">{formatDateTime(notice.created_at)}</td>
                <td className="px-3 py-2 text-zinc-700">{formatDateTime(notice.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
