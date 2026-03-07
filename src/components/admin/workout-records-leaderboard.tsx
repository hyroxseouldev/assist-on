"use client";

import { Award, Loader2, Medal, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { getAdminUserWorkoutRecordsAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  AdminWorkoutExerciseOption,
  AdminWorkoutLeaderboardItem,
  AdminWorkoutPresetOption,
  AdminUserWorkoutRecordRow,
} from "@/lib/admin/types";

type WorkoutRecordsLeaderboardProps = {
  exerciseOptions: AdminWorkoutExerciseOption[];
  presetOptions: AdminWorkoutPresetOption[];
  selectedExerciseKey: string;
  selectedPresetKey: string;
  items: AdminWorkoutLeaderboardItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatSecondsToTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatWeightKg(value: number) {
  if (Number.isInteger(value)) {
    return `${value}kg`;
  }

  return `${value.toFixed(1)}kg`;
}

function formatExerciseLabel(value: string) {
  const known: Record<string, string> = {
    rowing: "로잉",
    ski: "스키",
    running: "러닝",
    squat: "스쿼트",
    deadlift: "데드리프트",
    bench_press: "벤치프레스",
  };

  if (known[value]) {
    return known[value];
  }

  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatPresetLabel(option: AdminWorkoutPresetOption) {
  if (option.distance_m != null) {
    return `${option.distance_m}m`;
  }

  if (option.target_reps != null) {
    return `${option.target_reps}RM`;
  }

  return option.preset_key;
}

function formatPresetFromRecord(record: AdminUserWorkoutRecordRow) {
  if (record.distance != null) {
    return `${record.distance}m`;
  }

  if (record.record_reps != null) {
    return `${record.record_reps}RM`;
  }

  return record.preset_key ?? "-";
}

function getTopRankStyle(rank: number) {
  if (rank === 1) {
    return {
      rowClassName: "bg-gradient-to-r from-amber-50/90 via-yellow-50/70 to-amber-50/90",
      badgeClassName:
        "border-amber-300 bg-gradient-to-r from-amber-200 to-yellow-100 text-amber-950 shadow-[0_4px_16px_rgba(245,158,11,0.25)]",
      badgeText: "TOP 1",
    };
  }

  if (rank === 2) {
    return {
      rowClassName: "bg-gradient-to-r from-slate-100/80 via-zinc-50/60 to-slate-100/80",
      badgeClassName:
        "border-slate-300 bg-gradient-to-r from-slate-200 to-zinc-100 text-slate-900 shadow-[0_3px_12px_rgba(100,116,139,0.2)]",
      badgeText: "TOP 2",
    };
  }

  if (rank === 3) {
    return {
      rowClassName: "bg-gradient-to-r from-orange-100/70 via-amber-50/40 to-orange-100/70",
      badgeClassName:
        "border-orange-300 bg-gradient-to-r from-orange-200 to-amber-100 text-orange-900 shadow-[0_3px_12px_rgba(234,88,12,0.2)]",
      badgeText: "TOP 3",
    };
  }

  return {
    rowClassName: "",
    badgeClassName: "",
    badgeText: "",
  };
}

function TopRankIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Trophy className="size-3.5 motion-safe:animate-bounce" />;
  }

  if (rank === 2) {
    return <Medal className="size-3.5 motion-safe:animate-pulse" />;
  }

  return <Award className="size-3.5 motion-safe:animate-pulse" />;
}

function formatLeaderboardValue(item: AdminWorkoutLeaderboardItem) {
  if (item.record_type === "time") {
    if (item.best_seconds == null) {
      return "-";
    }

    return formatSecondsToTime(item.best_seconds);
  }

  if (item.best_weight_kg == null) {
    return "-";
  }

  return formatWeightKg(item.best_weight_kg);
}

function formatRecordValue(record: AdminUserWorkoutRecordRow) {
  if (record.record_type === "time") {
    if (record.record_seconds == null) {
      return "-";
    }

    return formatSecondsToTime(record.record_seconds);
  }

  if (record.record_weight_kg == null) {
    return "-";
  }

  return formatWeightKg(record.record_weight_kg);
}

export function WorkoutRecordsLeaderboard({
  exerciseOptions,
  presetOptions,
  selectedExerciseKey,
  selectedPresetKey,
  items,
  total,
  page,
  pageSize,
  totalPages,
}: WorkoutRecordsLeaderboardProps) {
  const [isDetailPending, startDetailTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedItem, setSelectedItem] = useState<AdminWorkoutLeaderboardItem | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("회원");
  const [selectedUserRecords, setSelectedUserRecords] = useState<AdminUserWorkoutRecordRow[]>([]);

  const summaryText = useMemo(() => {
    if (total === 0) {
      return "조회된 기록이 없습니다.";
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}명 중 ${start}-${end}위 표시`;
  }, [page, pageSize, total]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

  const pushWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const handleExerciseChange = (nextExerciseKey: string) => {
    pushWithParams({
      exerciseKey: nextExerciseKey,
      presetKey: null,
      page: "1",
    });
  };

  const handlePresetChange = (nextPresetKey: string) => {
    pushWithParams({
      presetKey: nextPresetKey,
      page: "1",
    });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({
      pageSize: nextPageSize,
      page: "1",
    });
  };

  const handleOpenUserDetail = (item: AdminWorkoutLeaderboardItem) => {
    setSelectedItem(item);
    setSelectedUserName(item.user_name);
    setSelectedUserRecords([]);

    startDetailTransition(async () => {
      const result = await getAdminUserWorkoutRecordsAction(item.user_id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setSelectedUserName(result.userName ?? item.user_name);
      setSelectedUserRecords(result.items ?? []);
    });
  };

  if (exerciseOptions.length === 0) {
    return <p className="text-sm text-zinc-500">활성화된 운동 항목이 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px]">
        <Select value={selectedExerciseKey} onValueChange={handleExerciseChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="운동 선택" />
          </SelectTrigger>
          <SelectContent>
            {exerciseOptions.map((option) => (
              <SelectItem key={option.exercise_key} value={option.exercise_key}>
                {formatExerciseLabel(option.exercise_key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPresetKey} onValueChange={handlePresetChange} disabled={presetOptions.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프리셋 선택" />
          </SelectTrigger>
          <SelectContent>
            {presetOptions.map((option) => (
              <SelectItem key={option.preset_key} value={option.preset_key}>
                {formatPresetLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20개</SelectItem>
            <SelectItem value="50">50개</SelectItem>
            <SelectItem value="100">100개</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{summaryText}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="w-20 px-3">순위</TableHead>
              <TableHead className="px-3">회원</TableHead>
              <TableHead className="w-28 px-3">기록</TableHead>
              <TableHead className="w-40 px-3">최근 기록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-3 py-8 text-center text-zinc-500">
                  해당 조건의 기록이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.user_id}
                  className={`cursor-pointer transition-transform duration-200 hover:scale-[1.003] ${getTopRankStyle(item.rank).rowClassName}`}
                  onClick={() => handleOpenUserDetail(item)}
                >
                  <TableCell className="px-3 font-semibold text-zinc-900">
                    <div className="flex items-center gap-2">
                      <span>{item.rank}</span>
                      {item.rank <= 3 ? (
                        <Badge variant="outline" className={`gap-1 ${getTopRankStyle(item.rank).badgeClassName}`}>
                          <TopRankIcon rank={item.rank} />
                          {getTopRankStyle(item.rank).badgeText}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-800">{item.user_name}</TableCell>
                  <TableCell className="px-3 font-mono text-zinc-900">{formatLeaderboardValue(item)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDate(item.latest_recorded_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageHref(Math.max(1, page - 1))}
              onClick={(event) => {
                if (page <= 1) {
                  event.preventDefault();
                }
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink href={createPageHref(pageNumber)} isActive={pageNumber === page}>
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href={createPageHref(Math.min(totalPages, page + 1))}
              onClick={(event) => {
                if (page >= totalPages) {
                  event.preventDefault();
                }
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>회원 전체 기록</DialogTitle>
            <DialogDescription>
              {selectedUserName} · 현재 순위 {selectedItem?.rank ?? "-"}위 · 최근 기록 200건
            </DialogDescription>
          </DialogHeader>

          {isDetailPending ? (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="mr-2 size-4 animate-spin" />
              기록을 불러오는 중입니다.
            </div>
          ) : selectedUserRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">표시할 기록이 없습니다.</p>
          ) : (
            <div className="max-h-[460px] overflow-y-auto rounded-md border border-zinc-200">
              <Table>
                <TableHeader className="bg-zinc-50 text-zinc-600">
                  <TableRow>
                    <TableHead className="px-3">운동</TableHead>
                    <TableHead className="px-3">프리셋</TableHead>
                    <TableHead className="px-3">기록</TableHead>
                    <TableHead className="px-3">유형</TableHead>
                    <TableHead className="px-3">기록일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUserRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="px-3 text-zinc-900">{formatExerciseLabel(record.exercise_key)}</TableCell>
                      <TableCell className="px-3 text-zinc-700">{formatPresetFromRecord(record)}</TableCell>
                      <TableCell className="px-3 font-mono text-zinc-900">{formatRecordValue(record)}</TableCell>
                      <TableCell className="px-3 text-zinc-700">{record.record_type === "time" ? "시간" : "중량"}</TableCell>
                      <TableCell className="px-3 text-zinc-700">{formatDate(record.recorded_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
