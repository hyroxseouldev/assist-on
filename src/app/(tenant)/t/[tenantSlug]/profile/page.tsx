import { redirect } from "next/navigation";

import { ProfileAvatarUploader } from "@/components/profile/profile-avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/profile-name-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TenantProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/tenant/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; avatar_url: string | null }>();

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
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">프로필 이미지와 기본 계정 정보를 관리합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
          <CardDescription>이름은 수정할 수 있고, 이메일은 현재 계정 기준으로 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProfileAvatarUploader displayName={displayName} avatarUrl={avatarUrl} />

          <div className="space-y-3 text-sm">
            <ProfileNameEditor initialFullName={profile?.full_name ?? ""} />
            <div className="rounded-md border bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">이메일</p>
              <p className="mt-1 font-medium text-zinc-900">{user.email ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
