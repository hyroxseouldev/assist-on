"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { usePathname, useSearchParams } from "next/navigation";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AdminGuestOrderRevenueMonth,
  AdminGuestOrderRevenueRange,
  AdminGuestOrderRevenueSummary,
} from "@/lib/admin/types";

type GuestOrdersRevenueChartProps = {
  items: AdminGuestOrderRevenueMonth[];
  summary: AdminGuestOrderRevenueSummary;
  range: AdminGuestOrderRevenueRange;
};

const chartConfig = {
  revenue_krw: {
    label: "매출",
    color: "var(--chart-1)",
  },
  confirmed_order_count: {
    label: "확정 주문",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const RANGE_OPTIONS: Array<{ value: AdminGuestOrderRevenueRange; label: string }> = [
  { value: "6", label: "최근 6개월" },
  { value: "12", label: "최근 12개월" },
  { value: "24", label: "최근 24개월" },
  { value: "all", label: "전체" },
];

function formatCurrency(value: number) {
  if (value <= 0) {
    return "0원";
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatCount(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}건`;
}

export function GuestOrdersRevenueChart({ items, summary, range }: GuestOrdersRevenueChartProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { push } = useAdminNavigation();
  const hasRevenue = summary.confirmed_order_count > 0;

  const chartItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        shortLabel: item.month.slice(2).replace("-", "."),
      })),
    [items]
  );

  const handleRangeChange = (nextRange: AdminGuestOrderRevenueRange) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextRange === "12") {
      params.delete("range");
    } else {
      params.set("range", nextRange);
    }

    const nextQuery = params.toString();
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const kpis = [
    { label: "선택 기간 총 매출", value: formatCurrency(summary.total_revenue_krw) },
    { label: "확정 주문 수", value: formatCount(summary.confirmed_order_count) },
    { label: "월 평균 매출", value: formatCurrency(summary.monthly_average_revenue_krw) },
    { label: "평균 주문 금액", value: formatCurrency(summary.average_order_amount_krw) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">확정 처리된 게스트 주문을 확정일 기준 월별 매출로 집계합니다.</p>
        <Select value={range} onValueChange={(value) => handleRangeChange(value as AdminGuestOrderRevenueRange)}>
          <SelectTrigger className="w-full bg-white sm:w-[150px]">
            <SelectValue aria-label={range} />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">{item.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">{item.value}</p>
          </div>
        ))}
      </div>

      {hasRevenue ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-zinc-950">월별 매출</h2>
            <p className="text-sm text-zinc-500">막대는 매출, 선은 확정 주문 수입니다.</p>
          </div>
          <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
            <ComposedChart data={chartItems} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="shortLabel" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                yAxisId="revenue"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={72}
                tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelKey="label"
                    formatter={(value, name) => {
                      const label = name === "revenue_krw" ? "매출" : "확정 주문";
                      const formattedValue =
                        name === "revenue_krw" ? formatCurrency(Number(value)) : formatCount(Number(value));

                      return (
                        <div className="flex min-w-[160px] items-center justify-between gap-4">
                          <span className="text-zinc-500">{label}</span>
                          <span className="font-mono font-medium text-zinc-950">{formattedValue}</span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar yAxisId="revenue" dataKey="revenue_krw" fill="var(--color-revenue_krw)" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="confirmed_order_count"
                stroke="var(--color-confirmed_order_count)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center">
          <p className="text-sm font-medium text-zinc-900">확정된 게스트 주문 매출이 없습니다.</p>
          <p className="mt-2 text-sm text-zinc-500">게스트 주문을 확정 처리하면 월별 매출 차트에 반영됩니다.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">월</TableHead>
              <TableHead className="px-3 text-right">매출</TableHead>
              <TableHead className="px-3 text-right">확정 주문 수</TableHead>
              <TableHead className="px-3 text-right">평균 주문 금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  표시할 월별 매출 데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.month}>
                  <TableCell className="px-3 font-medium text-zinc-900">{item.label}</TableCell>
                  <TableCell className="px-3 text-right text-zinc-700">{formatCurrency(item.revenue_krw)}</TableCell>
                  <TableCell className="px-3 text-right text-zinc-700">{formatCount(item.confirmed_order_count)}</TableCell>
                  <TableCell className="px-3 text-right text-zinc-700">{formatCurrency(item.average_order_amount_krw)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
