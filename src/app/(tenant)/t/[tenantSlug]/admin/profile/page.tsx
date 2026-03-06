import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProfileAvatarUploader } from "@/components/profile/profile-avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/profile-name-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminProfilePage() {
  const { supabase, user, isPlatformAdmin, tenantRole } = await requireAdminUser();

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
  const adminRoleLabel = isPlatformAdmin
    ? "플랫폼 관리자"
    : tenantRole === "owner"
    ? "테넌트 오너"
    : tenantRole === "coach"
    ? "코치"
    : "관리자";

  return (
    <AdminPageShell title="프로필 수정" description="관리자 계정의 프로필 이미지와 이름을 관리합니다.">
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
            <div className="rounded-md border bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">관리자 직급</p>
              <div className="mt-1">
                <Badge variant="secondary" className="bg-zinc-900 text-white hover:bg-zinc-900">
                  {adminRoleLabel}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
