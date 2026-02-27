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
            <th className="px-3 py-2 text-left font-medium">프로그램</th>
            <th className="px-3 py-2 text-left font-medium">금액</th>
            <th className="px-3 py-2 text-left font-medium">상태</th>
            <th className="px-3 py-2 text-left font-medium">결제완료</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-zinc-100">
              <td className="px-3 py-2 text-zinc-700">{formatDateTime(order.created_at)}</td>
              <td className="px-3 py-2 font-mono text-xs text-zinc-600">{order.provider_order_id}</td>
              <td className="px-3 py-2 text-zinc-900">{order.buyer_name}</td>
              <td className="px-3 py-2 text-zinc-700">{order.product_title}</td>
              <td className="px-3 py-2 font-medium text-zinc-900">{formatCurrency(order.amount_krw)}원</td>
              <td className="px-3 py-2 text-zinc-700">{order.status}</td>
              <td className="px-3 py-2 text-zinc-700">{formatDateTime(order.paid_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
