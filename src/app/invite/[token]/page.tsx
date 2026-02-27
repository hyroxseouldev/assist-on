import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { acceptInvitationAction } from "@/app/invite/[token]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationPreviewByToken } from "@/lib/invitations/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "테넌트 초대 수락 | Assist On",
  description: "초대 링크를 통해 테넌트에 참여합니다.",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const errorMessage = typeof query.error === "string" ? query.error : null;
  const invitation = await getInvitationPreviewByToken(token);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!invitation) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>초대 링크를 확인할 수 없습니다.</CardTitle>
            <CardDescription>링크가 올바르지 않거나 이미 삭제되었습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">로그인 페이지로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const disabled = invitation.isExpired || invitation.isExhausted;

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative size-12 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <Image src={invitation.logoUrl} alt={`${invitation.teamName} 로고`} fill className="object-cover" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Tenant Invite</p>
              <p className="text-sm font-semibold text-zinc-900">{invitation.teamName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{invitation.role}</Badge>
            <Badge variant={disabled ? "secondary" : "default"}>{disabled ? "만료/사용완료" : "사용 가능"}</Badge>
          </div>
          <CardTitle>{invitation.tenantName} 테넌트 초대</CardTitle>
          <CardDescription>
            {invitation.teamName} 워크스페이스에 참여합니다. 만료: {formatDateTime(invitation.expiresAt)} · 사용
            {" "}
            {invitation.usedCount}/{invitation.maxUses}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          {!user ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600">초대 수락을 위해 먼저 로그인해 주세요.</p>
              <Button asChild disabled={disabled} className="w-full">
                <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>로그인하고 초대 수락</Link>
              </Button>
            </div>
          ) : (
            <form action={acceptInvitationAction} className="space-y-2">
              <input type="hidden" name="token" value={token} />
              <Button type="submit" disabled={disabled} className="w-full">
                {disabled ? "만료된 초대입니다" : "초대 수락하고 테넌트 입장"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
