import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TenantMembershipRow = {
  tenant_id: string;
  tenants: {
    slug: string;
    name: string;
  } | null;
};

export default async function TenantSelectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tenant/login");
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, tenants:tenant_id(slug, name)")
    .eq("user_id", user.id)
    .returns<TenantMembershipRow[]>();

  const items = (memberships ?? []).filter((row) => row.tenants?.slug);

  if (items.length === 1 && items[0].tenants?.slug) {
    redirect(`/t/${items[0].tenants.slug}`);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9fbe6_0%,#f7faf8_45%,#ffffff_100%)] px-4 py-12">
      <main className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>테넌트 선택</CardTitle>
            <CardDescription>접속할 워크스페이스를 선택해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-zinc-600">
                참여한 테넌트가 없습니다. 초대 링크를 통해 참여한 뒤 다시 시도해 주세요.
              </p>
            ) : (
              items.map((membership) => {
                const tenant = membership.tenants;
                if (!tenant) return null;

                return (
                  <Link
                    key={membership.tenant_id}
                    href={`/t/${tenant.slug}`}
                    className="block rounded-md border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
                  >
                    {tenant.name}
                    <span className="ml-2 text-xs text-zinc-500">/{tenant.slug}</span>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
