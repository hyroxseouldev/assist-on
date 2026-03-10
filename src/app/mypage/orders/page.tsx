import { redirect } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { MyOrdersList } from "@/components/orders/my-orders-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyOrders } from "@/lib/store/server";

const ORDER_FILTERS = [
  { key: "all", label: "전체" },
  { key: "pending", label: "확인 중" },
  { key: "paid", label: "결제 완료" },
  { key: "failed", label: "문제 있음" },
] as const;

type OrderFilter = (typeof ORDER_FILTERS)[number]["key"];

export default async function MyPageOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { status } = await searchParams;

  let user: { id: string } | null = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage/orders")}`);
  }

  const items = await getMyOrders(user.id);
  const activeFilter = ORDER_FILTERS.some((filter) => filter.key === status) ? (status as OrderFilter) : "all";
  const filteredItems =
    activeFilter === "all"
      ? items
      : items.filter((item) => {
          if (activeFilter === "failed") {
            return item.status === "failed" || item.status === "canceled";
          }

          return item.status === activeFilter;
        });
  const summary = {
    total: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    paid: items.filter((item) => item.status === "paid").length,
    failed: items.filter((item) => item.status === "failed" || item.status === "canceled").length,
  };

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">주문/구매 내역</h1>
        <p className="text-sm text-zinc-600">스토어에서 진행한 결제와 입금 대기 주문을 한 곳에서 확인합니다.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <p className="text-xs font-medium text-zinc-500">전체 주문</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-700">확인 중</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-amber-950">{summary.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-700">결제 완료</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">{summary.paid}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-medium text-rose-700">문제 있음</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-rose-950">{summary.failed}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((filter) => {
          const href = filter.key === "all" ? "/mypage/orders" : `/mypage/orders?status=${filter.key}`;
          const active = filter.key === activeFilter;

          return (
            <Link key={filter.key} href={href} className="inline-flex">
              <Badge variant={active ? "default" : "outline"} className="h-9 rounded-md px-3 text-sm">
                {filter.label}
              </Badge>
            </Link>
          );
        })}
      </section>

      <MyOrdersList items={filteredItems} emptyTitle="조건에 맞는 주문이 없습니다" emptyDescription="필터를 바꾸거나 스토어에서 새로운 주문을 진행해 보세요." />
    </div>
  );
}
