"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { createCheckoutIntentAction } from "@/lib/store/actions";
import { Button } from "@/components/ui/button";

type BuyNowButtonProps = {
  tenantSlug: string;
  productId: string;
  saleType?: "one_time" | "subscription";
  disabled?: boolean;
};

type TossPaymentsInstance = {
  requestPayment: (method: "카드", payload: Record<string, unknown>) => void;
  requestBillingAuth: (method: "카드", payload: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

let tossScriptPromise: Promise<void> | null = null;

function loadTossScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
  }

  if (window.TossPayments) {
    return Promise.resolve();
  }

  if (tossScriptPromise) {
    return tossScriptPromise;
  }

  tossScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return tossScriptPromise;
}

export function BuyNowButton({ tenantSlug, productId, saleType = "one_time", disabled = false }: BuyNowButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCheckout = () => {
    startTransition(async () => {
      const result = await createCheckoutIntentAction({ tenantSlug, productId });

      if (!result.ok) {
        if (result.loginPath) {
          router.push(result.loginPath);
          return;
        }

        toast.error(result.message ?? "결제 준비에 실패했습니다.");
        return;
      }

      if (!result.payload) {
        toast.error("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        await loadTossScript();
        if (!window.TossPayments) {
          throw new Error("결제 모듈이 준비되지 않았습니다.");
        }

        const tossPayments = window.TossPayments(result.payload.clientKey);
        if (result.payload.mode === "subscription") {
          tossPayments.requestBillingAuth("카드", {
            customerKey: result.payload.customerKey,
            customerName: result.payload.customerName,
            customerEmail: result.payload.customerEmail,
            successUrl: result.payload.successUrl,
            failUrl: result.payload.failUrl,
          });
          return;
        }

        tossPayments.requestPayment("카드", {
          amount: result.payload.amount,
          orderId: result.payload.orderId,
          orderName: result.payload.orderName,
          customerName: result.payload.customerName,
          customerEmail: result.payload.customerEmail,
          successUrl: result.payload.successUrl,
          failUrl: result.payload.failUrl,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "결제창 실행에 실패했습니다.");
      }
    });
  };

  return (
    <Button className="w-full" disabled={disabled || isPending} onClick={handleCheckout}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      {isPending ? "결제 준비 중..." : saleType === "subscription" ? "구독 시작하기" : "바로 결제하기"}
    </Button>
  );
}
