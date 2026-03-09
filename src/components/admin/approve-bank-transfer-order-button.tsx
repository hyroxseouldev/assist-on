"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { approveBankTransferOrderAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";

type ApproveBankTransferOrderButtonProps = {
  orderId: string;
  orderLabel: string;
};

export function ApproveBankTransferOrderButton({ orderId, orderLabel }: ApproveBankTransferOrderButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    const shouldApprove = window.confirm(`${orderLabel} 주문을 입금 확인 처리할까요? 프로그램 권한이 즉시 활성화됩니다.`);
    if (!shouldApprove) {
      return;
    }

    const formData = new FormData();
    formData.set("orderId", orderId);

    startTransition(async () => {
      const result = await approveBankTransferOrderAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <Button type="button" size="sm" disabled={isPending} onClick={handleApprove}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      {isPending ? "처리 중..." : "입금 확인"}
    </Button>
  );
}
