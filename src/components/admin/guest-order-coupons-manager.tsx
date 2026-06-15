"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { createGuestOrderCouponAction, toggleGuestOrderCouponActiveAction } from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminGuestOrderCouponRow, GuestOrderCouponDiscountType } from "@/lib/admin/types";

type GuestOrderCouponsManagerProps = {
  coupons: AdminGuestOrderCouponRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DISCOUNT_TYPE_LABELS: Record<GuestOrderCouponDiscountType, string> = {
  amount: "정액",
  percent: "정률",
};

function formatDiscount(coupon: AdminGuestOrderCouponRow) {
  if (coupon.discount_type === "percent") {
    return `${coupon.discount_value}%`;
  }

  return `${new Intl.NumberFormat("ko-KR").format(coupon.discount_value)}원`;
}

function formatUsage(coupon: AdminGuestOrderCouponRow) {
  if (coupon.usage_limit === null) {
    return `${coupon.used_count}회 / 무제한`;
  }

  return `${coupon.used_count}회 / ${coupon.usage_limit}회`;
}

function getCouponStatus(coupon: AdminGuestOrderCouponRow) {
  const now = Date.now();
  const startsAt = coupon.starts_at ? Date.parse(coupon.starts_at) : null;
  const endsAt = coupon.ends_at ? Date.parse(coupon.ends_at) : null;

  if (!coupon.is_active) {
    return { label: "비활성", variant: "outline" as const };
  }

  if (startsAt !== null && startsAt > now) {
    return { label: "대기", variant: "secondary" as const };
  }

  if (endsAt !== null && endsAt <= now) {
    return { label: "만료", variant: "outline" as const };
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { label: "소진", variant: "outline" as const };
  }

  return { label: "활성", variant: "default" as const };
}

export function GuestOrderCouponsManager({ coupons, total, page, pageSize, totalPages }: GuestOrderCouponsManagerProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const formRef = useRef<HTMLFormElement>(null);
  const [discountType, setDiscountType] = useState<GuestOrderCouponDiscountType>("amount");
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [updatingCouponId, setUpdatingCouponId] = useState<string | null>(null);

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 쿠폰이 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    const nextQuery = params.toString();
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleCreate = (formData: FormData) => {
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("discountType", discountType);

    startCreateTransition(async () => {
      const result = await createGuestOrderCouponAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      formRef.current?.reset();
      setDiscountType("amount");
      router.refresh();
    });
  };

  const handleToggleActive = (coupon: AdminGuestOrderCouponRow) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("couponId", coupon.id);
    formData.set("isActive", String(!coupon.is_active));
    setUpdatingCouponId(coupon.id);

    startToggleTransition(async () => {
      const result = await toggleGuestOrderCouponActiveAction(formData);
      setUpdatingCouponId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          handleCreate(new FormData(event.currentTarget));
        }}
        className="rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_190px_190px_150px_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">코드</Label>
            <Input id="coupon-code" name="code" placeholder="CODE" maxLength={40} autoCapitalize="characters" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-discount-type">할인 방식</Label>
            <Select value={discountType} onValueChange={(value) => setDiscountType(value as GuestOrderCouponDiscountType)}>
              <SelectTrigger id="coupon-discount-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">정액</SelectItem>
                <SelectItem value="percent">정률</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-discount-value">{discountType === "percent" ? "할인율" : "할인액"}</Label>
            <Input
              id="coupon-discount-value"
              name="discountValue"
              type="number"
              min={1}
              max={discountType === "percent" ? 100 : undefined}
              placeholder={discountType === "percent" ? "10" : "10000"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-starts-at">시작일</Label>
            <Input id="coupon-starts-at" name="startsAt" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-ends-at">종료일</Label>
            <Input id="coupon-ends-at" name="endsAt" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-usage-limit">사용 제한</Label>
            <Input id="coupon-usage-limit" name="usageLimit" type="number" min={1} placeholder="무제한" />
          </div>
          <input type="hidden" name="isActive" value="true" />
          <Button type="submit" disabled={isCreatePending}>
            {isCreatePending ? <Loader2 className="size-4 animate-spin" /> : null}
            쿠폰 생성
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">{summaryText}</p>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-[110px] self-end sm:self-auto">
            <SelectValue aria-label={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩</SelectItem>
            <SelectItem value="20">20개씩</SelectItem>
            <SelectItem value="50">50개씩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">코드</TableHead>
              <TableHead className="px-3">할인</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">사용량</TableHead>
              <TableHead className="px-3">사용 기간</TableHead>
              <TableHead className="px-3">생성일</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  등록된 쿠폰이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const status = getCouponStatus(coupon);
                const isUpdating = isTogglePending && updatingCouponId === coupon.id;

                return (
                  <TableRow key={coupon.id}>
                    <TableCell className="px-3 font-mono font-semibold text-zinc-950">{coupon.code}</TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {DISCOUNT_TYPE_LABELS[coupon.discount_type]} · {formatDiscount(coupon)}
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatUsage(coupon)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {coupon.starts_at || coupon.ends_at ? (
                        <span>
                          {formatAdminDateTime(coupon.starts_at)} ~ {formatAdminDateTime(coupon.ends_at)}
                        </span>
                      ) : (
                        "상시"
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(coupon.created_at)}</TableCell>
                    <TableCell className="px-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isTogglePending}
                        onClick={() => handleToggleActive(coupon)}
                      >
                        {isUpdating ? <Loader2 className="size-4 animate-spin" /> : null}
                        {coupon.is_active ? "비활성화" : "활성화"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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
                if (page <= 1) event.preventDefault();
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
                if (page >= totalPages) event.preventDefault();
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
