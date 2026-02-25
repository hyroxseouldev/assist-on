import { redirect } from "next/navigation";

import { HomeSidebar } from "@/components/home/home-sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomeGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; avatar_url: string | null; role: "user" | "admin" }>();

  const displayName =
    typeof profile?.full_name === "string" && profile.full_name.length > 0
      ? profile.full_name
      : typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : user.email ?? "Athlete";
  const avatarUrl =
    typeof profile?.avatar_url === "string"
      ? profile.avatar_url
      : typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9fbe6_0%,#f7faf8_45%,#ffffff_100%)]">
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-8 lg:h-[60vh] lg:self-start">
          <HomeSidebar
            displayName={displayName}
            email={user.email ?? ""}
            avatarUrl={avatarUrl}
            isAdmin={profile?.role === "admin"}
          />
        </aside>
        <section className="space-y-6">{children}</section>
      </main>
    </div>
  );
}
