"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { grantAccessByEmailAction, removeTenantMemberAction, updateUserRoleAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ManagedUserRow, ManagedUserSortBy, SortOrder } from "@/lib/admin/types";

type AllUsersManagerProps = {
  users: ManagedUserRow[];
  programs: Array<{ id: string; label: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  sortBy: ManagedUserSortBy;
  order: SortOrder;
  canManageMembers: boolean;
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

function roleBadgeVariant(role: ManagedUserRow["role"]) {
  if (role === "owner") {
    return "default" as const;
  }

  return "secondary" as const;
}

export function AllUsersManager({
  users,
  programs,
  total,
  page,
  pageSize,
  totalPages,
  query,
  sortBy,
  order,
  canManageMembers,
}: AllUsersManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [selectedUser, setSelectedUser] = useState<ManagedUserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<"owner" | "coach" | "member">("member");
  const [grantRole, setGrantRole] = useState<"coach" | "member">("member");
  const [grantProgramId, setGrantProgramId] = useState(programs[0]?.id ?? "");
  const hasPrograms = programs.length > 0;

  const openUserDialog = (user: ManagedUserRow) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setGrantRole("member");
    setGrantProgramId(programs[0]?.id ?? "");
  };

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

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);

    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

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

  const handleChangeRole = (userId: string, role: "owner" | "coach" | "member") => {
    if (!canManageMembers) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", role);

    startTransition(async () => {
      const result = await updateUserRoleAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        setSelectedRole(role);
        setSelectedUser((current) => (current && current.id === userId ? { ...current, role } : current));
        return;
      }

      toast.error(result.message);
    });
  };

  const handleRemoveMember = (userId: string) => {
    if (!canManageMembers) {
      return;
    }

    const confirmed = window.confirm("해당 멤버를 테넌트에서 제거할까요?");
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", userId);

    startTransition(async () => {
      const result = await removeTenantMemberAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setSelectedUser(null);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  const handleGrantForSelectedUser = () => {
    if (!selectedUser?.email) {
      toast.error("선택한 유저의 이메일이 없습니다.");
      return;
    }

    if (!grantProgramId) {
      toast.error("권한을 부여할 프로그램을 선택해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("email", selectedUser.email);
    formData.set("role", grantRole);
    formData.set("programId", grantProgramId);

    startTransition(async () => {
      const result = await grantAccessByEmailAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <div className="space-y-4">
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

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{summaryText}</p>
        {!canManageMembers ? <Badge variant="outline">Coach 읽기 전용</Badge> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">이름</TableHead>
              <TableHead className="px-3">이메일</TableHead>
              <TableHead className="px-3">권한</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">최근 로그인</TableHead>
              <TableHead className="px-3">가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  조회된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => openUserDialog(user)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openUserDialog(user);
                    }
                  }}
                >
                  <TableCell className="px-3 font-medium text-zinc-900">{user.full_name}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{user.email || "-"}</TableCell>
                  <TableCell className="px-3">
                    <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={user.email_confirmed ? "default" : "outline"}>{user.email_confirmed ? "활성" : "미인증"}</Badge>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDateTime(user.last_sign_in_at)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDateTime(user.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageHref(Math.max(1, page - 1))}
              onClick={(event) => {
                if (page <= 1) {
                  event.preventDefault();
                }
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink href={createPageHref(pageNumber)} isActive={pageNumber === page}>
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href={createPageHref(Math.min(totalPages, page + 1))}
              onClick={(event) => {
                if (page >= totalPages) {
                  event.preventDefault();
                }
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => (!open ? setSelectedUser(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>유저 상세</DialogTitle>
            <DialogDescription>유저 정보를 확인하고 멤버 권한 액션을 수행할 수 있습니다.</DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">이름</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedUser.full_name}</p>
              </div>

              <div className="rounded-md border bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">이메일</p>
                <p className="mt-1 font-medium text-zinc-900">{selectedUser.email || "-"}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">현재 권한</p>
                  <div className="mt-1">
                    <Badge variant={roleBadgeVariant(selectedUser.role)}>{selectedUser.role}</Badge>
                  </div>
                </div>
                <div className="rounded-md border bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">상태</p>
                  <div className="mt-1">
                    <Badge variant={selectedUser.email_confirmed ? "default" : "outline"}>
                      {selectedUser.email_confirmed ? "활성" : "미인증"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">가입일</p>
                  <p className="mt-1 font-medium text-zinc-900">{formatDateTime(selectedUser.created_at)}</p>
                </div>
                <div className="rounded-md border bg-zinc-50 p-3">
                  <p className="text-xs text-zinc-500">최근 로그인</p>
                  <p className="mt-1 font-medium text-zinc-900">{formatDateTime(selectedUser.last_sign_in_at)}</p>
                </div>
              </div>

              {!canManageMembers ? (
                <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  coach 계정은 읽기 전용입니다. 권한 변경/제거는 owner만 수행할 수 있습니다.
                </p>
              ) : null}

              <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
                <div>
                  <p className="text-xs text-zinc-500">프로그램 접근권 부여</p>
                  <p className="mt-1 text-sm font-medium text-zinc-900">{selectedUser.email || "이메일 없음"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    선택한 프로그램 접근권을 추가하고, 기본 테넌트 역할(member/coach)을 함께 설정합니다.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="selected-user-grant-role">부여할 기본 역할</Label>
                    <select
                      id="selected-user-grant-role"
                      value={grantRole}
                      onChange={(event) => setGrantRole(event.target.value as "coach" | "member")}
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                      disabled={isPending || !canManageMembers}
                    >
                      <option value="member">member</option>
                      <option value="coach">coach</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="selected-user-grant-program">대상 프로그램</Label>
                    {hasPrograms ? (
                      <select
                        id="selected-user-grant-program"
                        value={grantProgramId}
                        onChange={(event) => setGrantProgramId(event.target.value)}
                        className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                        disabled={isPending || !canManageMembers}
                      >
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
                        권한을 부여할 프로그램이 없습니다.
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending || !canManageMembers || !hasPrograms || !selectedUser.email || !grantProgramId}
                  onClick={handleGrantForSelectedUser}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isPending ? "처리 중..." : "프로그램 접근권 부여"}
                </Button>
              </div>

              <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
                <div>
                  <p className="text-xs text-zinc-500">테넌트 역할 변경</p>
                  <p className="mt-1 text-xs text-zinc-500">프로그램 접근권은 유지되고, 테넌트 역할만 변경됩니다.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value as "owner" | "coach" | "member")}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 sm:w-40"
                    disabled={isPending || !selectedUser || !canManageMembers}
                  >
                    <option value="member">member</option>
                    <option value="coach">coach</option>
                    <option value="owner">owner</option>
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || !selectedUser || !canManageMembers || selectedUser.role === selectedRole}
                    onClick={() => selectedUser && handleChangeRole(selectedUser.id, selectedRole)}
                    className="w-full sm:w-auto"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isPending ? "처리 중..." : "역할 저장"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-start">
              <Button
                type="button"
                variant="destructive"
                disabled={isPending || !selectedUser || !canManageMembers}
                onClick={() => selectedUser && handleRemoveMember(selectedUser.id)}
                className="w-full sm:w-auto"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                제거
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
