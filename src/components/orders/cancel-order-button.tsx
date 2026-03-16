"use client";

import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cancelMyOrderAction } from "@/lib/store/actions";

type CancelOrderButtonProps = {
  orderId: string;
  orderLabel: string;
};

export function CancelOrderButton({ orderId, orderLabel }: CancelOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    const shouldCancel = window.confirm(`${orderLabel} 주문을 취소할까요? 확인 중인 주문만 취소할 수 있습니다.`);
    if (!shouldCancel) {
      return;
    }

    const formData = new FormData();
    formData.set("orderId", orderId);

    startTransition(async () => {
      const result = await cancelMyOrderAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Button type="button" variant="outline" className="h-10 border-red-200 px-4 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={isPending} onClick={handleCancel}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
      {isPending ? "취소 중..." : "주문 취소"}
    </Button>
  );
}
