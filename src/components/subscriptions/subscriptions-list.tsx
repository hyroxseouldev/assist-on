"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelMySubscriptionAction, resumeMySubscriptionAction } from "@/lib/subscriptions/actions";
import type { UserSubscriptionListItem } from "@/lib/subscriptions/server";

type SubscriptionsListProps = {
  items: UserSubscriptionListItem[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toStatusLabel(status: UserSubscriptionListItem["status"]) {
  if (status === "active") return "활성";
  if (status === "past_due") return "결제 실패";
  if (status === "incomplete") return "준비 중";
  return "해지됨";
}

function toStatusVariant(status: UserSubscriptionListItem["status"]): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "past_due") return "destructive";
  if (status === "incomplete") return "secondary";
  return "outline";
}

export function SubscriptionsList({ items }: SubscriptionsListProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const runCancel = (subscriptionId: string) => {
    const formData = new FormData();
    formData.set("subscriptionId", subscriptionId);
    startTransition(async () => {
      const result = await cancelMySubscriptionAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  const runResume = (subscriptionId: string) => {
    const formData = new FormData();
    formData.set("subscriptionId", subscriptionId);
    startTransition(async () => {
      const result = await resumeMySubscriptionAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>내 구독</CardTitle>
          <CardDescription>현재 활성화된 구독이 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/t/select">테넌트 선택으로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const tenant = item.product?.tenant;
        const program = item.product?.program;
        const tenantHomeHref = tenant ? `/t/${tenant.slug}` : null;
        const tenantStoreHref = tenant ? `/store/${tenant.slug}` : null;

        return (
          <Card key={item.id} className="border-zinc-200/80 bg-white/95">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={toStatusVariant(item.status)}>{toStatusLabel(item.status)}</Badge>
                {item.cancel_at_period_end ? <Badge variant="outline">해지 예약</Badge> : null}
              </div>
              <CardTitle className="text-lg">{program?.title ?? "프로그램"}</CardTitle>
              <CardDescription>
                {tenant ? (
                  <span>
                    {tenant.name} <span className="text-zinc-400">/{tenant.slug}</span>
                  </span>
                ) : (
                  "테넌트 정보 없음"
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p className="text-zinc-600">요금: {formatCurrency(item.product?.price_krw ?? 0)}원 / 월</p>
                <p className="text-zinc-600">다음 결제일: {formatDateTime(item.next_billing_at)}</p>
                <p className="text-zinc-600">현재 기간 시작: {formatDateTime(item.current_period_start_at)}</p>
                <p className="text-zinc-600">현재 기간 종료: {formatDateTime(item.current_period_end_at)}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {item.cancel_at_period_end ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4"
                    disabled={isPending || item.status === "canceled"}
                    onClick={() => runResume(item.id)}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    해지 취소
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 border-red-200 px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={isPending || item.status === "canceled"}
                    onClick={() => runCancel(item.id)}
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    해지 예약
                  </Button>
                )}

                {tenantHomeHref ? (
                  <Button asChild variant="outline" className="h-10 px-4">
                    <Link href={tenantHomeHref}>테넌트 홈</Link>
                  </Button>
                ) : null}

                {tenantStoreHref ? (
                  <Button asChild variant="outline" className="h-10 px-4">
                    <Link href={tenantStoreHref}>스토어</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
