import { redirect } from "next/navigation";

import { MyPageSideNav } from "@/components/account/mypage-side-nav";
import { PublicHeader } from "@/components/navigation/public-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MyPageLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

  if (profile?.account_status === "deactivated") {
    await supabase.auth.signOut();
    redirect("/login?error=deactivated");
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <MyPageSideNav />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </main>
    </>
  );
}
