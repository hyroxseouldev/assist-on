"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { ProgramChangeSection, type UserGrantProgramOption } from "@/components/admin/program-change-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManagedUserRow } from "@/lib/admin/types";

type Props = {
  users: ManagedUserRow[];
  programs: UserGrantProgramOption[];
  query: string;
  page: number;
  totalPages: number;
  total: number;
  nowTimestamp: number;
};

export function ProgramChangesManager({ users, programs, query, page, totalPages, total, nowTimestamp }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { push } = useAdminNavigation();
  const [search, setSearch] = useState(query);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-4" aria-label="변경할 회원 검색">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedUserId(null);
            const params = new URLSearchParams(searchParams.toString());
            params.set("q", search.trim());
            params.set("page", "1");
            push(`${pathname}?${params.toString()}`);
          }}
        >
          <Input aria-label="회원 검색" placeholder="이름, 이메일, 휴대폰 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button type="submit" variant="outline">검색</Button>
        </form>
        <p className="text-sm text-zinc-500">총 {total}명 · 변경할 회원을 선택해 주세요.</p>
        <div className="space-y-2">
          {users.length === 0 ? <p className="rounded-lg border p-6 text-sm text-zinc-500">검색 결과가 없습니다.</p> : null}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              aria-pressed={selectedUserId === user.id}
              onClick={() => setSelectedUserId(user.id)}
              className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-600 aria-pressed:border-emerald-500 aria-pressed:bg-emerald-50"
            >
              <p className="font-medium text-zinc-900">{user.full_name}</p>
              <p className="mt-1 break-all text-xs text-zinc-500">{user.email || user.phone_number || "연락처 없음"}</p>
              <p className="mt-2 text-xs text-zinc-600">
                {user.program_entitlements?.find((item) => item.program_id === user.active_program_id && item.is_active)?.program_title || "현재 선택 프로그램 없음"}
              </p>
            </button>
          ))}
        </div>
        <nav aria-label="회원 목록 페이지" className="flex items-center justify-between">
          {page > 1 ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}>이전</Link></Button> : <span />}
          <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
          {page < totalPages ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>다음</Link></Button> : <span />}
        </nav>
      </section>
      <section className="min-w-0 space-y-4" aria-label="참여 프로그램 변경 및 이력">
        {selectedUser ? (
          <>
            <div>
              <h2 className="text-lg font-semibold">{selectedUser.full_name}님의 참여 프로그램</h2>
              <p className="mt-1 text-sm text-zinc-500">변경할 프로그램과 이용 종료일을 확인해 주세요.</p>
            </div>
            <ProgramChangeSection
              key={selectedUser.id + JSON.stringify(selectedUser.program_entitlements)}
              selectedUser={selectedUser}
              programs={programs}
              nowTimestamp={nowTimestamp}
            />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
            <h2 className="font-medium text-zinc-900">회원을 선택해 주세요</h2>
            <p className="mt-2 text-sm text-zinc-500">현재 프로그램을 확인하고 참여 프로그램 변경과 이력 조회를 할 수 있습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
