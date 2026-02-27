import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NoticeRow } from "@/lib/admin/types";

type HomeNoticesTableProps = {
  notices: NoticeRow[];
  noticesPath: string;
};

function formatNoticeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function HomeNoticesTable({ notices, noticesPath }: HomeNoticesTableProps) {
  return (
    <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>공지사항</CardTitle>
          <Link href={noticesPath} className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            전체보기
          </Link>
        </div>
        <CardDescription>최신 공지 3개를 확인하세요.</CardDescription>
      </CardHeader>

      <CardContent>
        {notices.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 공지사항이 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">구분</TableHead>
                <TableHead>제목</TableHead>
                <TableHead className="hidden w-28 sm:table-cell">등록일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell>
                    <Badge variant="secondary">공지</Badge>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <Link href={`${noticesPath}/${notice.id}`} className="line-clamp-1 font-medium text-zinc-900 hover:underline">
                      {notice.title}
                    </Link>
                    <p className="pt-1 text-xs text-zinc-500 sm:hidden">{formatNoticeDate(notice.created_at)}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-zinc-500 sm:table-cell">{formatNoticeDate(notice.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
