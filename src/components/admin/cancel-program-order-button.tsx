"use client";

import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelProgramOrderAction } from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";

type CancelProgramOrderButtonProps = {
  orderId: string;
  orderLabel: string;
  onCanceled?: () => void;
};

export function CancelProgramOrderButton({ orderId, orderLabel, onCanceled }: CancelProgramOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const tenantSlug = useTenantSlug();

  const handleCancel = () => {
    const shouldCancel = window.confirm(`${orderLabel} 주문을 취소할까요? 확인 중인 주문만 취소할 수 있습니다.`);
    if (!shouldCancel) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("orderId", orderId);

    startTransition(async () => {
      const result = await cancelProgramOrderAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onCanceled?.();
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      disabled={isPending}
      onClick={handleCancel}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
      {isPending ? "취소 중..." : "주문 취소"}
    </Button>
  );
}
