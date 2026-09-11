"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ProgramChangeSection, type UserGrantProgramOption } from "@/components/admin/program-change-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ManagedUserProgramEntitlement, ManagedUserRow } from "@/lib/admin/types";

type Props = {
  users: ManagedUserRow[];
  programs: UserGrantProgramOption[];
  query: string;
  programId: string | null;
  activeOnly: boolean;
  page: number;
  totalPages: number;
  total: number;
  nowTimestamp: number;
};

function isActiveEntitlement(item: ManagedUserProgramEntitlement, now: number) {
  return item.is_active && Date.parse(item.starts_at) <= now &&
    (!item.ends_at || Date.parse(item.ends_at) >= now);
}

export function ProgramChangesManager({ users, programs, query, programId, activeOnly, page, totalPages, total, nowTimestamp }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = users.find((user) => user.id === selectedUserId);
  const hasFilters = Boolean(query || programId || activeOnly);

  const navigate = (next: { query?: string; programId?: string | null; activeOnly?: boolean; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = (next.query ?? search).trim();
    const nextProgramId = next.programId === undefined ? programId : next.programId;
    if (nextQuery) params.set("q", nextQuery); else params.delete("q");
    if (nextProgramId) params.set("program", nextProgramId); else params.delete("program");
    if (next.activeOnly ?? activeOnly) params.set("active", "1"); else params.delete("active");
    params.set("page", String(next.page ?? 1));
    if (params.toString() === searchParams.toString()) return;
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <section className="min-w-0 space-y-3" aria-label="변경할 회원 검색" aria-busy={isPending}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({});
          }}
        >
          <Label htmlFor="program-change-member-search">회원 검색</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-zinc-400" aria-hidden="true" />
              <Input
                id="program-change-member-search"
                type="search"
                placeholder="이름, 이메일, 휴대폰 뒷자리"
                autoComplete="off"
                className="pl-9"
                value={search}
                disabled={isPending}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "조회 중" : "검색"}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-change-member-program">참여 프로그램</Label>
            <select
              id="program-change-member-program"
              value={programId ?? ""}
              onChange={(event) => navigate({ programId: event.target.value || null })}
              disabled={isPending}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              <option value="">전체 프로그램</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.label}</option>)}
            </select>
          </div>
          <div className="flex min-h-9 items-center justify-between gap-2">
            <Label htmlFor="program-change-active-only" className="cursor-pointer gap-2 text-sm font-normal">
              <Checkbox
                id="program-change-active-only"
                checked={activeOnly}
                disabled={isPending}
                onCheckedChange={(checked) => navigate({ activeOnly: checked === true })}
              />
              변경 가능한 회원만
            </Label>
            {hasFilters || search ? (
              <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => {
                setSearch("");
                navigate({ query: "", programId: null, activeOnly: false });
              }}>
                <X className="size-3.5" aria-hidden="true" /> 초기화
              </Button>
            ) : null}
          </div>
        </form>
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500" role="status" aria-live="polite">
          <span>{isPending ? "회원을 찾고 있습니다…" : `${hasFilters ? "검색 결과" : "전체 회원"} ${total}명`}</span>
          <span>{total > 0 ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, total)}명 표시` : ""}</span>
        </div>
        <div
          className="max-h-[min(50vh,520px)] space-y-2 overflow-y-auto overscroll-contain rounded-lg p-1"
          role="region"
          aria-label="회원 검색 결과"
          tabIndex={0}
        >
          {users.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium text-zinc-700">조건에 맞는 회원이 없습니다.</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">검색어를 줄이거나 프로그램·변경 가능 필터를 해제해 보세요.</p>
            </div>
          ) : null}
          {users.map((user) => {
            const activeEntitlements = (user.program_entitlements ?? []).filter((item) => isActiveEntitlement(item, nowTimestamp));
            const currentProgram = activeEntitlements.find((item) => item.program_id === programId) ??
              activeEntitlements.find((item) => item.program_id === user.active_program_id) ?? activeEntitlements[0];
            const phoneDigits = user.phone_number?.replace(/\D/g, "") ?? "";
            return (
              <button
                key={user.id}
                type="button"
                disabled={isPending}
                aria-pressed={selectedUserId === user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 aria-pressed:border-emerald-500 aria-pressed:bg-emerald-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-medium text-zinc-900">{user.full_name}</span>
                  <span className="text-xs text-zinc-500">{phoneDigits ? `휴대폰 ···· ${phoneDigits.slice(-4)}` : "휴대폰 미등록"}</span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500" title={user.email}>{user.email || "이메일 미등록"}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-700" title={currentProgram?.program_title}>
                  {currentProgram?.program_title || "변경 가능한 활성 프로그램 없음"}
                </p>
                {activeEntitlements.length > 1 ? <p className="mt-1 text-xs text-emerald-700">활성 이용권 {activeEntitlements.length}개</p> : null}
              </button>
            );
          })}
        </div>
        <nav aria-label="회원 목록 페이지" className="flex items-center justify-between border-t pt-3">
          <Button variant="outline" size="sm" disabled={isPending || page <= 1} onClick={() => navigate({ query, page: page - 1 })}>이전</Button>
          <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={isPending || page >= totalPages} onClick={() => navigate({ query, page: page + 1 })}>다음</Button>
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
