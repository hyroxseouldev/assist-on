"use client";

import { Copy, Loader2, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createInvitationLinkAction, deleteInvitationLinkAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TenantInvitationRow } from "@/lib/admin/types";

type InvitationManagerProps = {
  invitations: TenantInvitationRow[];
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

export function InvitationManager({ invitations }: InvitationManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [latestInvitationLink, setLatestInvitationLink] = useState<string | null>(null);

  const handleDeleteInvitation = (invitationId: string) => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);

    startTransition(async () => {
      const result = await deleteInvitationLinkAction(formData);

      if (result.ok) {
        toast.success(result.message);
        return;
      }

      toast.error(result.message);
    });
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("초대 링크를 복사했습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다. 수동으로 복사해 주세요.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createInvitationLinkAction(formData);

      if (result.ok) {
        toast.success(result.message);
        if (result.invitationLink) {
          setLatestInvitationLink(result.invitationLink);
        }
        form.reset();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="role">테넌트 권한</Label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
          >
            <option value="member">member</option>
            <option value="coach">coach</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expiresHours">만료 시간(시간)</Label>
            <Input id="expiresHours" name="expiresHours" type="number" min={1} max={720} defaultValue={72} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxUses">사용 가능 횟수</Label>
            <Input id="maxUses" name="maxUses" type="number" min={1} max={100} defaultValue={1} required />
          </div>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "생성 중..." : "초대 링크 생성"}
        </Button>
      </form>

      {latestInvitationLink ? (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-900">최근 생성한 초대 링크</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={latestInvitationLink} readOnly className="bg-white" />
            <Button type="button" variant="outline" onClick={() => handleCopyLink(latestInvitationLink)}>
              <Copy className="size-4" />
              복사
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">활성 초대 링크</p>

        {invitations.length === 0 ? (
          <p className="text-sm text-zinc-500">생성된 초대 링크가 없습니다.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">권한</th>
                  <th className="px-3 py-2 text-left font-medium">사용</th>
                  <th className="px-3 py-2 text-left font-medium">만료</th>
                  <th className="px-3 py-2 text-left font-medium">생성일</th>
                  <th className="px-3 py-2 text-left font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 text-zinc-900">{invitation.role}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      {invitation.used_count}/{invitation.max_uses}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{formatDateTime(invitation.expires_at)}</td>
                    <td className="px-3 py-2 text-zinc-700">{formatDateTime(invitation.created_at)}</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <Trash2 className="size-4" />
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
