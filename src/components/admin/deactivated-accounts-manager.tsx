"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { reactivateDeactivatedAccountAction } from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import type { AdminDeactivatedAccountRow } from "@/lib/admin/types";
import { formatAdminDateTime } from "@/lib/admin/format";
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

function getRoleLabel(role: "owner" | "manager" | "coach" | "member") {
  if (role === "manager") return "매니저";
  if (role === "owner") return "오너";
  if (role === "coach") return "코치";
  return "멤버";
}

function getRoleBadgeAppearance(role: "owner" | "manager" | "coach" | "member") {
  if (role === "owner") return "warning" as const;
  if (role === "coach") return "info" as const;
  return "success" as const;
}

export function DeactivatedAccountsManager({ items }: DeactivatedAccountsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tenantSlug = useTenantSlug();

  const handleReactivate = (userId: string) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
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
    return <p className="rounded-md border border-line bg-surface-subtle p-4 text-sm text-ink-muted">비활성 계정이 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <Table>
        <TableHeader className="bg-surface-subtle text-ink-muted">
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
              <TableCell className="px-3 font-medium text-ink">{item.full_name}</TableCell>
              <TableCell className="px-3 text-ink-secondary">{item.email || "-"}</TableCell>
              <TableCell className="px-3">
                <Badge variant="outline" appearance={getRoleBadgeAppearance(item.role)}>
                  {getRoleLabel(item.role)}
                </Badge>
              </TableCell>
              <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(item.deactivated_at)}</TableCell>
              <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(item.last_sign_in_at)}</TableCell>
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
