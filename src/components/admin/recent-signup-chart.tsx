"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type RecentSignupChartItem = {
  dateKey: string;
  label: string;
  count: number;
};

type RecentSignupChartProps = {
  items: RecentSignupChartItem[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function RecentSignupChart({ items }: RecentSignupChartProps) {
  const maxSignupCount = Math.max(1, ...items.map((item) => item.count));
  const chartDescription = items.map((item) => `${item.label} ${formatCount(item.count)}명`).join(", ");

  return (
    <>
      <div className="sr-only" aria-label={`최근 일주일 회원 가입 현황: ${chartDescription}`} />
      <TooltipProvider delayDuration={80}>
        <div className="flex h-40 w-full items-end justify-center gap-1">
          {items.map((item, index) => {
            const heightPercent = Math.max(12, Math.round((item.count / maxSignupCount) * 100));

            return (
              <Tooltip key={item.dateKey}>
                <TooltipTrigger asChild>
                  <div className="flex w-8 shrink-0 cursor-default flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2 sm:w-9">
                    <span className="text-xs font-medium tabular-nums text-zinc-800">{formatCount(item.count)}</span>
                    <div className="flex h-28 w-full items-end justify-center">
                      <div
                        className="admin-signup-bar w-7 rounded-t-md bg-zinc-950 transition-colors hover:bg-zinc-700 sm:w-8"
                        style={{
                          height: `${heightPercent}%`,
                          animationDelay: `${index * 70}ms`,
                        }}
                      />
                    </div>
                    <span className="w-full truncate text-center text-[11px] leading-4 text-zinc-500">{item.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  {item.label} 가입 {formatCount(item.count)}명
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </>
  );
}
