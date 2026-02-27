"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateUserRoleAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagedUserRow, ManagedUserSortBy, SortOrder } from "@/lib/admin/types";

type UsersManagerProps = {
  users: ManagedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  sortBy: ManagedUserSortBy;
  order: SortOrder;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function UsersManager({
  users,
  total,
  page,
  pageSize,
  totalPages,
  query,
  sortBy,
  order,
}: UsersManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);

  const summaryText = useMemo(() => {
    if (total === 0) return "검색 결과가 없습니다.";

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}명 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

  const pushWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleSearch = () => {
    pushWithParams({ q: searchValue.trim() || null, page: "1" });
  };

  const handleSortByChange = (nextSortBy: string) => {
    pushWithParams({ sortBy: nextSortBy, page: "1" });
  };

  const handleOrderChange = (nextOrder: string) => {
    pushWithParams({ order: nextOrder, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleMovePage = (nextPage: number) => {
    pushWithParams({ page: String(nextPage) });
  };

  const handleChangeRole = (userId: string, role: "owner" | "coach" | "member") => {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", role);

    startTransition(async () => {
      const result = await updateUserRoleAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-[1fr_170px_130px_130px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="이름 또는 이메일 검색"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button variant="outline" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <Select value={sortBy} onValueChange={handleSortByChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">가입일</SelectItem>
            <SelectItem value="last_sign_in_at">최근 로그인</SelectItem>
            <SelectItem value="full_name">이름</SelectItem>
          </SelectContent>
        </Select>

        <Select value={order} onValueChange={handleOrderChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">내림차순</SelectItem>
            <SelectItem value="asc">오름차순</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개</SelectItem>
            <SelectItem value="20">20개</SelectItem>
            <SelectItem value="50">50개</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-zinc-500">{summaryText}</p>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 text-left font-medium">이름</th>
              <th className="px-3 py-2 text-left font-medium">이메일</th>
              <th className="px-3 py-2 text-left font-medium">권한</th>
              <th className="px-3 py-2 text-left font-medium">상태</th>
              <th className="px-3 py-2 text-left font-medium">초대/로그인</th>
              <th className="px-3 py-2 text-left font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  조회된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-zinc-100 align-top">
                  <td className="px-3 py-2 text-zinc-900">{user.full_name}</td>
                  <td className="px-3 py-2 text-zinc-700">{user.email || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={user.role === "owner" ? "default" : "secondary"}>{user.role}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={user.email_confirmed ? "default" : "outline"}>
                      {user.email_confirmed ? "활성" : "미인증"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    <p>초대: {formatDateTime(user.invited_at)}</p>
                    <p>로그인: {formatDateTime(user.last_sign_in_at)}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || user.role === "member"}
                        onClick={() => handleChangeRole(user.id, "member")}
                      >
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        member
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || user.role === "coach"}
                        onClick={() => handleChangeRole(user.id, "coach")}
                      >
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        coach
                      </Button>
                      <Button
                        size="sm"
                        disabled={isPending || user.role === "owner"}
                        onClick={() => handleChangeRole(user.id, "owner")}
                      >
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                        owner
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          페이지 {page} / {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handleMovePage(page - 1)}>
            이전
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handleMovePage(page + 1)}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
