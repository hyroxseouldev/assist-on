import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProfileAvatarUploader } from "@/components/profile/profile-avatar-uploader";
import { ProfileNameEditor } from "@/components/profile/profile-name-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/admin/server";
import type { ProfileGender } from "@/lib/profile/gender";
import { ensureTenantUserProfile, resolveTenantAvatarUrl, resolveTenantDisplayName } from "@/lib/tenant/server";

export default async function TenantAdminProfilePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, user, isPlatformAdmin, tenantRole, tenant } = await requireAdminUser(tenantSlug, { allowCoach: true });

  const tenantProfile = await ensureTenantUserProfile(supabase, tenant.id, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, gender")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null; avatar_url: string | null; gender: ProfileGender | null }>();

  const displayName = resolveTenantDisplayName(tenantProfile, profile, user, "Athlete");
  const avatarUrl = resolveTenantAvatarUrl(tenantProfile, profile, user) ?? undefined;
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
          <CardDescription>이름과 사진은 현재 테넌트 기준으로 저장되며, 이메일은 현재 계정 기준으로 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProfileAvatarUploader tenantSlug={tenantSlug} displayName={displayName} avatarUrl={avatarUrl} />

          <div className="space-y-3 text-sm">
            <ProfileNameEditor tenantSlug={tenantSlug} initialFullName={tenantProfile.display_name ?? profile?.full_name ?? ""} initialGender={profile?.gender ?? null} />
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
