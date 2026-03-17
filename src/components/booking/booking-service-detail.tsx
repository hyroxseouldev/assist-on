"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicBookingOption, PublicBookingSlot } from "@/lib/booking/server";
import { getTenantBookingCheckoutPath } from "@/lib/booking/paths";
import { cn } from "@/lib/utils";

type BookingServiceDetailProps = {
  tenantSlug: string;
  serviceId: string;
  serviceName: string;
  serviceDescription: string;
  options: PublicBookingOption[];
  slots: PublicBookingSlot[];
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startsAt))} - ${formatter.format(new Date(endsAt))}`;
}

export function BookingServiceDetail({
  tenantSlug,
  serviceId,
  serviceName,
  serviceDescription,
  options,
  slots,
}: BookingServiceDetailProps) {
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  const slotsByDate = useMemo(() => {
    const grouped = new Map<string, PublicBookingSlot[]>();

    for (const slot of slots) {
      const rows = grouped.get(slot.slotDate) ?? [];
      rows.push(slot);
      grouped.set(slot.slotDate, rows);
    }

    return Array.from(grouped.entries());
  }, [slots]);

  const checkoutHref =
    selectedOptionId && selectedSlotId
      ? `${getTenantBookingCheckoutPath(tenantSlug, serviceId)}?optionId=${encodeURIComponent(selectedOptionId)}&slotId=${encodeURIComponent(selectedSlotId)}`
      : null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_30%),linear-gradient(135deg,#fffdf7_0%,#ffffff_45%,#eef7f2_100%)] px-6 py-8 shadow-lg shadow-zinc-900/5 sm:px-8 sm:py-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex w-fit rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Booking Service
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{serviceName}</h1>
          <p className="text-sm leading-7 text-zinc-700 sm:text-base">
            {serviceDescription || "실전과 가까운 환경에서 현재 상태를 점검하고, 코치 피드백까지 이어지는 예약 서비스입니다."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[2rem] border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight text-zinc-950">1. 옵션 선택</CardTitle>
            <CardDescription>원하는 예약 옵션을 먼저 선택해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500">현재 선택 가능한 옵션이 없습니다.</div>
            ) : (
              options.map((option) => {
                const isSelected = option.id === selectedOptionId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedOptionId(option.id)}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold">{option.name}</p>
                        {option.description ? (
                          <p className={cn("mt-2 text-sm leading-6", isSelected ? "text-white/72" : "text-zinc-600")}>{option.description}</p>
                        ) : null}
                      </div>
                      <span className={cn("shrink-0 text-sm font-semibold", isSelected ? "text-emerald-300" : "text-zinc-700")}>
                        {formatCurrency(option.priceKrw)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-zinc-200/80 bg-white/95 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight text-zinc-950">2. 슬롯 선택</CardTitle>
            <CardDescription>원하는 날짜와 시간을 선택하면 체크아웃으로 이동할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {slotsByDate.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-sm text-zinc-500">현재 열려 있는 예약 슬롯이 없습니다.</div>
            ) : (
              slotsByDate.map(([slotDate, rows]) => (
                <div key={slotDate} className="space-y-3">
                  <p className="text-sm font-semibold text-zinc-900">{formatDateLabel(slotDate)}</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((slot) => {
                      const isSelected = slot.id === selectedSlotId;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={cn(
                            "rounded-2xl border px-4 py-4 text-left transition-colors",
                            isSelected ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-white"
                          )}
                        >
                          <p className="text-sm font-semibold text-zinc-900">{formatTimeRange(slot.startsAt, slot.endsAt)}</p>
                          <p className="mt-1 text-xs text-zinc-500">{slot.durationMinutes}분</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="flex flex-col gap-3 rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">3. 예약 진행</p>
                <p className="text-sm leading-6 text-zinc-600">옵션과 시간을 모두 선택하면 예약 접수 페이지로 이동합니다.</p>
              </div>
              {checkoutHref ? (
                <Button asChild size="lg" className="min-w-40">
                  <Link href={checkoutHref}>예약 진행하기</Link>
                </Button>
              ) : (
                <Button size="lg" className="min-w-40" disabled>
                  옵션과 슬롯 선택
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
