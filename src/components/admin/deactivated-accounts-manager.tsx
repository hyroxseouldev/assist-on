"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { reactivateDeactivatedAccountAction } from "@/lib/admin/actions";
import type { AdminDeactivatedAccountRow } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DeactivatedAccountsManagerProps = {
  items: AdminDeactivatedAccountRow[];
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DeactivatedAccountsManager({ items }: DeactivatedAccountsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReactivate = (userId: string) => {
    const formData = new FormData();
    formData.set("userId", userId);

    startTransition(async () => {
      const result = await reactivateDeactivatedAccountAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  if (items.length === 0) {
    return <p className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">비활성 계정이 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <Table>
        <TableHeader className="bg-zinc-50 text-zinc-600">
          <TableRow>
            <TableHead className="px-3">이름</TableHead>
            <TableHead className="px-3">이메일</TableHead>
            <TableHead className="px-3">권한</TableHead>
            <TableHead className="px-3">비활성화 일시</TableHead>
            <TableHead className="px-3">최근 로그인</TableHead>
            <TableHead className="px-3 text-right">액션</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="px-3 font-medium text-zinc-900">{item.full_name}</TableCell>
              <TableCell className="px-3 text-zinc-700">{item.email || "-"}</TableCell>
              <TableCell className="px-3">
                <Badge variant="outline">{item.role}</Badge>
              </TableCell>
              <TableCell className="px-3 text-zinc-700">{formatDateTime(item.deactivated_at)}</TableCell>
              <TableCell className="px-3 text-zinc-700">{formatDateTime(item.last_sign_in_at)}</TableCell>
              <TableCell className="px-3 text-right">
                <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => handleReactivate(item.id)}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isPending ? "처리 중..." : "계정 복구"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
