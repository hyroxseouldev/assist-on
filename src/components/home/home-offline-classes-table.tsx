import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

type HomeOfflineClassesTableProps = {
  classes: OfflineClassWithParticipants[];
  offlineClassesPath: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HomeOfflineClassesTable({ classes, offlineClassesPath }: HomeOfflineClassesTableProps) {
  return (
    <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>오프라인 클래스</CardTitle>
          <Link
            href={offlineClassesPath}
            className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            전체보기
          </Link>
        </div>
        <CardDescription>다가오는 클래스 3개를 확인하세요.</CardDescription>
      </CardHeader>

      <CardContent>
        {classes.length === 0 ? (
          <p className="text-sm text-zinc-500">진행 예정 오프라인 클래스가 없습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>클래스명</TableHead>
                <TableHead className="w-36">일시</TableHead>
                <TableHead className="hidden sm:table-cell">장소</TableHead>
                <TableHead className="w-20 text-right">정원</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((offlineClass) => (
                <TableRow key={offlineClass.id}>
                  <TableCell className="min-w-0">
                    <Link
                      href={`${offlineClassesPath}/${offlineClass.id}`}
                      className="line-clamp-1 font-medium text-zinc-900 hover:underline"
                    >
                      {offlineClass.title}
                    </Link>
                    <p className="pt-1 text-xs text-zinc-500 sm:hidden">{offlineClass.location_text}</p>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-600">
                    <p>{formatDateTime(offlineClass.starts_at)}</p>
                    <p className="text-zinc-400">~ {formatDateTime(offlineClass.ends_at)}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">{offlineClass.location_text}</TableCell>
                  <TableCell className="text-right text-sm text-zinc-700">
                    {offlineClass.participants.length}/{offlineClass.capacity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
