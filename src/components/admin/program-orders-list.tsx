"use client";

import { Eye } from "lucide-react";
import { useMemo, useState } from "react";

import { ApproveBankTransferOrderButton } from "@/components/admin/approve-bank-transfer-order-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminProgramOrderRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type ProgramOrdersListProps = {
  orders: AdminProgramOrderRow[];
};

type OrderFilter = "all" | "bank_pending" | "bank_paid" | "toss";

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

function formatPaymentMethod(value: string | null) {
  if (value === "bank_transfer") return "무통장";
  if (value === "toss_subscription") return "토스 구독";
  if (value === "toss_card") return "토스 카드";
  return "-";
}

function getStatusMeta(status: string) {
  if (status === "paid") {
    return { label: "입금 확인", variant: "default" as const, rowClassName: "bg-emerald-50/60" };
  }

  if (status === "pending") {
    return { label: "입금 대기", variant: "secondary" as const, rowClassName: "bg-amber-50/50" };
  }

  if (status === "failed") {
    return { label: "실패", variant: "destructive" as const, rowClassName: "bg-rose-50/50" };
  }

  if (status === "canceled") {
    return { label: "취소", variant: "outline" as const, rowClassName: "bg-zinc-50" };
  }

  return { label: status, variant: "outline" as const, rowClassName: "" };
}

function matchesFilter(order: AdminProgramOrderRow, filter: OrderFilter) {
  if (filter === "bank_pending") {
    return order.payment_method === "bank_transfer" && order.status === "pending";
  }

  if (filter === "bank_paid") {
    return order.payment_method === "bank_transfer" && order.status === "paid";
  }

  if (filter === "toss") {
    return order.payment_method === "toss_card" || order.payment_method === "toss_subscription";
  }

  return true;
}

const FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "bank_pending", label: "무통장 대기" },
  { id: "bank_paid", label: "무통장 확인" },
  { id: "toss", label: "토스 결제" },
];

export function ProgramOrdersList({ orders }: ProgramOrdersListProps) {
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("bank_pending");
  const [selectedOrder, setSelectedOrder] = useState<AdminProgramOrderRow | null>(null);

  const filteredOrders = useMemo(() => orders.filter((order) => matchesFilter(order, activeFilter)), [activeFilter, orders]);

  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500">아직 주문 내역이 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count = orders.filter((order) => matchesFilter(order, filter.id)).length;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                activeFilter === filter.id
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
              )}
            >
              <span>{filter.label}</span>
              <span className={cn("rounded-full px-1.5 text-xs", activeFilter === filter.id ? "bg-white/15" : "bg-zinc-100")}>{count}</span>
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? <p className="text-sm text-zinc-500">선택한 조건의 주문이 없습니다.</p> : null}

      {filteredOrders.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">주문일</th>
                <th className="px-3 py-2 text-left font-medium">주문번호</th>
                <th className="px-3 py-2 text-left font-medium">회원</th>
                <th className="px-3 py-2 text-left font-medium">연락처</th>
                <th className="px-3 py-2 text-left font-medium">입금자명</th>
                <th className="px-3 py-2 text-left font-medium">프로그램</th>
                <th className="px-3 py-2 text-left font-medium">금액</th>
                <th className="px-3 py-2 text-left font-medium">결제수단</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">결제완료</th>
                <th className="px-3 py-2 text-left font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusMeta = getStatusMeta(order.status);

                return (
                  <tr key={order.id} className={`border-t border-zinc-100 ${statusMeta.rowClassName}`.trim()}>
                    <td className="px-3 py-2 text-zinc-700">{formatDateTime(order.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-600">{order.provider_order_id}</td>
                    <td className="px-3 py-2 text-zinc-900">
                      <div className="space-y-0.5">
                        <p>{order.buyer_name}</p>
                        {order.buyer_email ? <p className="text-xs text-zinc-500">{order.buyer_email}</p> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{order.buyer_phone || "-"}</td>
                    <td className="px-3 py-2 text-zinc-700">{order.depositor_name || "-"}</td>
                    <td className="px-3 py-2 text-zinc-700">{order.product_title}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{formatCurrency(order.amount_krw)}원</td>
                    <td className="px-3 py-2 text-zinc-700">{formatPaymentMethod(order.payment_method)}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{formatDateTime(order.paid_at)}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                          <Eye className="size-4" />
                          상세
                        </Button>
                        {order.payment_method === "bank_transfer" && order.status === "pending" ? (
                          <ApproveBankTransferOrderButton
                            orderId={order.id}
                            orderLabel={order.provider_order_id}
                            onApproved={() => setActiveFilter("bank_pending")}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => (!open ? setSelectedOrder(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>주문 상세</DialogTitle>
            <DialogDescription>주문 정보와 입금 확인 상태를 확인합니다.</DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">주문번호</p>
                <p className="mt-1 font-mono text-sm text-zinc-900">{selectedOrder.provider_order_id}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">주문 상태</p>
                <div className="mt-1">
                  <Badge variant={getStatusMeta(selectedOrder.status).variant}>{getStatusMeta(selectedOrder.status).label}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">구매자</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedOrder.buyer_name}</p>
                <p className="text-sm text-zinc-600">{selectedOrder.buyer_email || "-"}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">전화번호</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedOrder.buyer_phone || "-"}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">입금자명</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedOrder.depositor_name || "-"}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">결제수단</p>
                <p className="mt-1 font-medium text-zinc-900">{formatPaymentMethod(selectedOrder.payment_method)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">프로그램</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedOrder.product_title}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">결제금액</p>
                <p className="mt-1 font-medium text-zinc-900">{formatCurrency(selectedOrder.amount_krw)}원</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">주문일</p>
                <p className="mt-1 font-medium text-zinc-900">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">결제완료일</p>
                <p className="mt-1 font-medium text-zinc-900">{formatDateTime(selectedOrder.paid_at)}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
