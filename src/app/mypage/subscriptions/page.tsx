import { redirect } from "next/navigation";

import { SubscriptionsList } from "@/components/subscriptions/subscriptions-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMySubscriptions } from "@/lib/subscriptions/server";

export default async function MyPageSubscriptionsPage() {
  const supabase = await createSupabaseServerClient();

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
    redirect(`/login?next=${encodeURIComponent("/mypage/subscriptions")}`);
  }

  const items = await getMySubscriptions(user.id);

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">내 구독</h1>
        <p className="text-sm text-zinc-600">모든 테넌트의 구독 상태를 한 곳에서 관리합니다.</p>
      </section>
      <SubscriptionsList items={items} />
    </div>
  );
}
