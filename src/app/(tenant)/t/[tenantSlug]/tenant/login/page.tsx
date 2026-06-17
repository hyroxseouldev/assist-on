import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getTenantLoginPath } from "@/lib/auth/paths";
import {
  getDefaultSignedInPath,
  isSafeInternalPath,
  normalizeTenantMemberships,
  type TenantMembershipRow,
} from "@/lib/auth/redirects";
import { getPrimaryProgramBrandingForTenant } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug, getTenantUserProfile } from "@/lib/tenant/server";

export const metadata: Metadata = {
  title: "테넌트 로그인 | Assist On",
  description: "Assist On 코치/운영자용 테넌트 워크스페이스 로그인",
};

export default async function TenantLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenantSlug }, query] = await Promise.all([params, searchParams]);
  const next = typeof query.next === "string" ? query.next : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;
  const showDeactivatedMessage = error === "deactivated";

  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBrandingForTenant(tenantSlug)]);
  const user = userRes.data.user;

  if (user) {
    const [tenant, { data: profile }] = await Promise.all([
      getTenantBySlug(supabase, tenantSlug),
      supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle<{ account_status: "active" | "deactivated" | null }>(),
    ]);

    const tenantProfile = tenant ? await getTenantUserProfile(supabase, tenant.id, user.id) : null;

    if (profile?.account_status === "deactivated" || tenantProfile?.tenant_status === "deactivated") {
      await supabase.auth.signOut();
      redirect(`${getTenantLoginPath(tenantSlug)}?error=deactivated`);
    }

    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    const adminPath = getDefaultSignedInPath(normalizeTenantMemberships(memberships));

    if (!adminPath) {
      await supabase.auth.signOut();
      redirect(getTenantLoginPath(tenantSlug));
    }

    if (next && isSafeInternalPath(next) && next.startsWith("/t/") && next.includes("/admin")) {
      redirect(next);
    }

    redirect(adminPath);
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(520px,0.92fr)]">
        <section className="relative hidden min-h-screen overflow-hidden bg-zinc-100 px-14 py-16 lg:flex lg:items-center lg:justify-center xl:px-20">
          <div className="absolute left-1/2 top-1/2 h-[470px] w-[470px] -translate-x-[24%] -translate-y-[62%] rounded-full bg-zinc-300/70" />
          <div className="absolute left-1/2 top-1/2 h-[590px] w-[590px] -translate-x-[44%] -translate-y-[34%]">
            <div className="h-full w-full rounded-full border-2 border-dashed border-zinc-400/55" />
          </div>
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-[72%] translate-y-[14%] rounded-full bg-zinc-300/65" />

          <div
            className="relative w-full max-w-[760px] overflow-hidden rounded-[30px] bg-white/70 p-[2px] shadow-[0_24px_80px_rgba(24,24,27,0.12)]"
            aria-hidden="true"
          >
            <div className="absolute -inset-[58%] [animation:spin_5.5s_linear_infinite] [background:conic-gradient(from_0deg,transparent_0deg,transparent_64deg,rgba(113,113,122,0.62)_92deg,transparent_124deg,transparent_360deg)]" />
            <div className="relative rounded-[28px] border border-zinc-200/80 bg-white/85 p-3">
              <div className="overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-sm">
                <Image
                  src="/admin-login-preview.png"
                  alt=""
                  width={1600}
                  height={883}
                  priority
                  className="aspect-[1600/883] w-full object-cover opacity-90 blur-[0.4px] saturate-[0.72]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16 xl:px-20">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
            >
              <ChevronLeft className="size-4" />
              웹사이트로 돌아가기
            </Link>
          </div>

          <div className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-[480px] py-12">
              <div className="flex items-center gap-3">
                <span className="relative block size-10 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm">
                  <Image
                    src={branding.logoUrl}
                    alt={`${branding.teamName} 로고`}
                    fill
                    className="object-contain"
                    sizes="48px"
                    priority
                  />
                </span>
                <p className="min-w-0 truncate text-xl font-bold tracking-tight text-zinc-950">{branding.teamName}</p>
              </div>

              <div className="mt-8 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">관리자 로그인</h1>
                <p className="text-base text-zinc-500">코치와 운영자를 위한 어드민 워크스페이스입니다.</p>
              </div>

              {showDeactivatedMessage ? (
                <Alert variant="destructive" className="mt-8">
                  <AlertTitle>비활성화된 계정입니다</AlertTitle>
                  <AlertDescription>
                    계정 삭제 요청으로 로그인할 수 없습니다. 복구가 필요하면 테넌트 owner 또는 플랫폼 관리자에게 문의해 주세요.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-8">
                <LoginForm next={next} tenantSlug={tenantSlug} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
