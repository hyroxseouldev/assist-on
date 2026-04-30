"use client";

import Image from "next/image";
import { useMemo } from "react";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminCoachProfileRow } from "@/lib/admin/types";

function getRoleLabel(role: "owner" | "coach" | "member") {
  if (role === "owner") return "Owner";
  if (role === "coach") return "Coach";
  return "Member";
}

type CoachProfilesListProps = {
  tenantSlug: string;
  profiles: AdminCoachProfileRow[];
  canManageMembers: boolean;
};

export function CoachProfilesList({ tenantSlug, profiles, canManageMembers }: CoachProfilesListProps) {
  const { push } = useAdminNavigation();
  const basePath = `/t/${tenantSlug}/admin/coaches`;

  const summaryText = useMemo(() => {
    if (profiles.length === 0) return "등록된 코치 프로필이 없습니다.";
    return `총 ${profiles.length}명의 코치 프로필`;
  }, [profiles.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">{summaryText}</p>
        {canManageMembers ? <Button onClick={() => push(`${basePath}/new`)}>코치 생성</Button> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">대표 이미지</TableHead>
              <TableHead className="px-3">표시 이름</TableHead>
              <TableHead className="px-3">계정</TableHead>
              <TableHead className="px-3">역할</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">생성일</TableHead>
              <TableHead className="px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  등록된 코치 프로필이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              profiles.map((profile) => (
                <TableRow key={profile.id} className="cursor-pointer" onClick={() => push(`${basePath}/${profile.id}`)}>
                  <TableCell className="px-3">
                    <div className="relative size-12 overflow-hidden rounded-full border border-zinc-200 bg-white">
                      <Image
                        src={profile.image_url || profile.member_avatar_url || "/logo.png"}
                        alt={`${profile.display_name} 대표 이미지`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-medium text-zinc-900">{profile.display_name}</TableCell>
                  <TableCell className="px-3 text-zinc-700">
                    <div className="space-y-1">
                      <p>{profile.member_full_name}</p>
                      <p className="text-xs text-zinc-500">{profile.member_email || "이메일 없음"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{getRoleLabel(profile.member_role)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{profile.is_active ? "활성" : "비활성"}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(profile.created_at)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(profile.updated_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
