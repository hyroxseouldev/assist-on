import { ApproveBankTransferOrderButton } from "@/components/admin/approve-bank-transfer-order-button";
import type { AdminProgramOrderRow } from "@/lib/admin/types";

type ProgramOrdersListProps = {
  orders: AdminProgramOrderRow[];
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

function formatPaymentMethod(value: string | null) {
  if (value === "bank_transfer") return "무통장";
  if (value === "toss_subscription") return "토스 구독";
  if (value === "toss_card") return "토스 카드";
  return "-";
}

export function ProgramOrdersList({ orders }: ProgramOrdersListProps) {
  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500">아직 주문 내역이 없습니다.</p>;
  }

  return (
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
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-zinc-100">
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
              <td className="px-3 py-2 text-zinc-700">{order.status}</td>
              <td className="px-3 py-2 text-zinc-700">{formatDateTime(order.paid_at)}</td>
              <td className="px-3 py-2 text-zinc-700">
                {order.payment_method === "bank_transfer" && order.status === "pending" ? (
                  <ApproveBankTransferOrderButton orderId={order.id} orderLabel={order.provider_order_id} />
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
