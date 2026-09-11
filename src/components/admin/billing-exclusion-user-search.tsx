"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchBillingExclusionUsers } from "@/lib/billing/actions";
import type { BillingUserSearchPage } from "@/lib/billing/actions";

export function BillingExclusionUserSearch({ tenantSlug, onClose, onSelect }: {
  tenantSlug: string;
  onClose: () => void;
  onSelect: (user: BillingUserSearchPage["items"][number]) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [result, setResult] = useState<BillingUserSearchPage | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function search(value: string, page: number) {
    setError("");
    startTransition(async () => {
      try {
        const response = await searchBillingExclusionUsers(tenantSlug, { query: value, page });
        if (!response.ok) {
          setError(response.message);
          return;
        }
        setResult(response.data);
        setSearchedQuery(value);
      } catch {
        setError("회원을 검색하지 못했습니다. 로그인과 접근 권한을 확인해 주세요.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>청구 제외할 회원 검색</DialogTitle>
          <DialogDescription>
            이 고객사의 전체 회원에서 검색합니다. 이번 달 청구 대상이 아니어도 미리 제외할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); search(query.trim(), 1); }}>
          <Label htmlFor="billing-exclusion-user-query">이름 · 이메일 · 전화번호</Label>
          <div className="flex gap-2">
            <Input id="billing-exclusion-user-query" className="min-w-0" value={query} maxLength={100}
              placeholder="검색어 입력 (비워두면 전체 조회)" disabled={pending}
              onChange={(event) => setQuery(event.target.value)} />
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}검색
            </Button>
          </div>
        </form>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div aria-live="polite" aria-busy={pending}>
          {result ? (
            <>
              <p className="mb-2 text-xs text-zinc-500">검색 결과 {result.total.toLocaleString("ko-KR")}명</p>
              <div className="divide-y rounded-xl border border-zinc-200">
                {result.items.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 text-sm">
                      <p className="break-words font-medium">{user.name}</p>
                      <p className="mt-1 break-all text-xs text-zinc-500">{user.email || "이메일 없음"}</p>
                      {user.phone ? <p className="mt-1 text-xs text-zinc-500">{user.phone}</p> : null}
                    </div>
                    <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={pending || !!error}
                      aria-label={`${user.name} 청구 제외 선택`} onClick={() => onSelect(user)}>선택</Button>
                  </div>
                ))}
                {!result.items.length ? <p className="p-6 text-center text-sm text-zinc-500">검색된 회원이 없습니다.</p> : null}
              </div>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" aria-label="이전 검색 페이지" disabled={pending || result.page <= 1}
                  onClick={() => search(searchedQuery, result.page - 1)}><ChevronLeft className="size-4" /></Button>
                <span className="text-sm tabular-nums">{result.page} / {result.totalPages}</span>
                <Button variant="outline" size="icon" aria-label="다음 검색 페이지" disabled={pending || result.page >= result.totalPages}
                  onClick={() => search(searchedQuery, result.page + 1)}><ChevronRight className="size-4" /></Button>
              </div>
            </>
          ) : <p className="py-6 text-center text-sm text-zinc-500">검색 후 회원을 선택하면 적용 범위와 사유를 입력할 수 있습니다.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
