"use client";

import type { FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addTenantMemberByEmailAction,
  grantAccessByEmailAction,
  revokeProgramAccessAction,
  searchTenantUserCandidateByEmailAction,
  updateProgramEntitlementEndDateAction,
  updateUserRoleAction,
} from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminTenantUserCandidate, ManagedUserProgramEntitlement, ManagedUserRow, ManagedUserSortBy, SortOrder } from "@/lib/admin/types";

type UserGrantProgramOption = {
  id: string;
  label: string;
  deliveryMode: "fixed_date" | "cohort_based";
  cohorts: Array<{ id: string; name: string; starts_on: string; is_default: boolean }>;
};

type AllUsersManagerProps = {
  users: ManagedUserRow[];
  programs: UserGrantProgramOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  selectedProgramId: string;
  sortBy: ManagedUserSortBy;
  order: SortOrder;
  canManageMembers: boolean;
  nowTimestamp: number;
};

type UserDetailsContentProps = {
  selectedUser: ManagedUserRow;
  selectedRole: "owner" | "coach" | "member";
  grantRole: "coach" | "member";
  grantProgramId: string;
  grantCohortId: string;
  programs: UserGrantProgramOption[];
  hasPrograms: boolean;
  isPending: boolean;
  canManageMembers: boolean;
  nowTimestamp: number;
  setGrantRole: (role: "coach" | "member") => void;
  setGrantProgramId: (programId: string) => void;
  setGrantCohortId: (cohortId: string) => void;
  setSelectedRole: (role: "owner" | "coach" | "member") => void;
  handleGrantForSelectedUser: () => void;
  handleUpdateEntitlementEndDate: (entitlement: ManagedUserProgramEntitlement, formData: FormData) => void;
  handleRevokeProgramAccess: (programId: string, programTitle: string) => void;
  handleChangeRole: (userId: string, role: "owner" | "coach" | "member") => void;
  handleAvatarPreview: (user: ManagedUserRow) => void;
  onClose: () => void;
};

function toLocalDateTimeInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getRoleLabel(role: "owner" | "coach" | "member") {
  if (role === "owner") return "오너";
  if (role === "coach") return "코치";
  return "멤버";
}

function getRoleBadgeClass(role: "owner" | "coach" | "member") {
  if (role === "owner") return "border-amber-300 bg-amber-100 text-amber-800";
  if (role === "coach") return "border-sky-300 bg-sky-100 text-sky-800";
  return "border-emerald-300 bg-emerald-100 text-emerald-800";
}

function getInitial(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "?";
  }

  return trimmed.charAt(0).toUpperCase();
}

function getAccountStatus(user: ManagedUserRow) {
  if (user.account_status === "deactivated") {
    return {
      label: "비활성",
      className: "border-rose-300 bg-rose-100 text-rose-800",
    };
  }

  return {
    label: "활성",
    className: "border-emerald-300 bg-emerald-100 text-emerald-800",
  };
}

function getMembershipLabel(user: ManagedUserRow) {
  if (user.has_membership === false) {
    return "미등록";
  }

  return getRoleLabel(user.role);
}

function getProgramEntitlementStatus(entitlement: ManagedUserProgramEntitlement, nowTimestamp: number) {
  if (!entitlement.is_active) {
    return { label: "비활성", variant: "outline" as const };
  }

  if (Date.parse(entitlement.starts_at) > nowTimestamp) {
    return { label: "대기", variant: "secondary" as const };
  }

  if (!entitlement.ends_at) {
    return { label: "활성", variant: "default" as const };
  }

  return Date.parse(entitlement.ends_at) >= nowTimestamp
    ? { label: "활성", variant: "default" as const }
    : { label: "만료", variant: "secondary" as const };
}

function isRevocableEntitlement(entitlement: ManagedUserProgramEntitlement, nowTimestamp: number) {
  return getProgramEntitlementStatus(entitlement, nowTimestamp).label === "활성";
}

function getProgramFilterStatus(user: ManagedUserRow, programId: string, nowTimestamp: number) {
  const entitlement = (user.program_entitlements ?? []).find((item) => item.program_id === programId);
  if (!entitlement) {
    return null;
  }

  const status = getProgramEntitlementStatus(entitlement, nowTimestamp);
  if (status.label === "활성") {
    return {
      label: "활성",
      className: "border-emerald-300 bg-emerald-100 text-emerald-800",
    };
  }

  if (status.label === "만료") {
    return {
      label: "만료",
      className: "border-amber-300 bg-amber-100 text-amber-800",
    };
  }

  return {
    label: "비활성",
    className: "border-zinc-300 bg-zinc-100 text-zinc-700",
  };
}

function UserDetailsContent({
  selectedUser,
  selectedRole,
  grantRole,
  grantProgramId,
  grantCohortId,
  programs,
  hasPrograms,
  isPending,
  canManageMembers,
  nowTimestamp,
  setGrantRole,
  setGrantProgramId,
  setGrantCohortId,
  setSelectedRole,
  handleGrantForSelectedUser,
  handleUpdateEntitlementEndDate,
  handleRevokeProgramAccess,
  handleChangeRole,
  handleAvatarPreview,
  onClose,
}: UserDetailsContentProps) {
  const hasAvatar = Boolean(selectedUser.avatar_url);
  const handleEntitlementEndDateSubmit = (event: FormEvent<HTMLFormElement>, entitlement: ManagedUserProgramEntitlement) => {
    event.preventDefault();
    handleUpdateEntitlementEndDate(entitlement, new FormData(event.currentTarget));
  };
  const selectedGrantProgram = programs.find((program) => program.id === grantProgramId) ?? null;
  const grantCohorts = selectedGrantProgram?.cohorts ?? [];
  const shouldShowCohortSelect = selectedGrantProgram?.deliveryMode === "cohort_based";

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 text-sm sm:px-6 sm:pb-6">
        <div className="rounded-md border bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500">프로필</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAvatarPreview(selectedUser)}
              disabled={!hasAvatar}
              aria-label={hasAvatar ? `${selectedUser.full_name} 프로필 사진 확대` : undefined}
              className={hasAvatar ? "cursor-zoom-in rounded-full" : "cursor-default rounded-full"}
            >
              <Avatar className="size-10 transition-transform duration-200 hover:scale-105">
                <AvatarImage src={selectedUser.avatar_url ?? undefined} alt={`${selectedUser.full_name} 프로필`} />
                <AvatarFallback>{getInitial(selectedUser.full_name)}</AvatarFallback>
              </Avatar>
            </button>
            <div className="space-y-1">
              <p className="font-medium text-zinc-900">{selectedUser.full_name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getAccountStatus(selectedUser).className}>
                  {getAccountStatus(selectedUser).label}
                </Badge>
                {selectedUser.deactivated_at ? (
                  <span className="text-xs text-zinc-500">비활성화: {formatAdminDateTime(selectedUser.deactivated_at)}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

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
              <Badge
                variant="outline"
                className={selectedUser.has_membership === false ? undefined : getRoleBadgeClass(selectedUser.role)}
              >
                {getMembershipLabel(selectedUser)}
              </Badge>
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
            <p className="mt-1 font-medium text-zinc-900">{formatAdminDateTime(selectedUser.created_at)}</p>
          </div>
          <div className="rounded-md border bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">최근 로그인</p>
            <p className="mt-1 font-medium text-zinc-900">{formatAdminDateTime(selectedUser.last_sign_in_at)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
          <div>
            <p className="text-xs text-zinc-500">프로그램 권한</p>
            <p className="mt-1 text-xs text-zinc-500">활성, 만료, 비활성 권한 이력을 모두 표시합니다.</p>
          </div>

          {(selectedUser.program_entitlements ?? []).length === 0 ? (
            <p className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
              부여된 프로그램 권한이 없습니다.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(selectedUser.program_entitlements ?? []).map((entitlement) => {
                const status = getProgramEntitlementStatus(entitlement, nowTimestamp);
                const isCurrentProgram = selectedUser.active_program_id === entitlement.program_id;
                const canRevokeEntitlement = canManageMembers && isRevocableEntitlement(entitlement, nowTimestamp);

                return (
                  <div
                    key={entitlement.id}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900">{entitlement.program_title}</p>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {entitlement.cohort_name ? <Badge variant="outline">{entitlement.cohort_name}</Badge> : null}
                          {isCurrentProgram ? <Badge variant="secondary">현재 선택 프로그램</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          시작: {formatAdminDateTime(entitlement.starts_at)} / 종료: {formatAdminDateTime(entitlement.ends_at)}
                        </p>
                        {canManageMembers && entitlement.is_active ? (
                          <form
                            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                            onSubmit={(event) => handleEntitlementEndDateSubmit(event, entitlement)}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <Label htmlFor={`entitlement-end-${entitlement.id}`} className="text-xs text-zinc-500">
                                종료일 변경
                              </Label>
                              <Input
                                id={`entitlement-end-${entitlement.id}`}
                                name="endsAt"
                                type="datetime-local"
                                required
                                defaultValue={toLocalDateTimeInputValue(entitlement.ends_at)}
                              />
                            </div>
                            <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
                              종료일 저장
                            </Button>
                          </form>
                        ) : null}
                      </div>

                      {canManageMembers ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending || !canRevokeEntitlement}
                          onClick={() => handleRevokeProgramAccess(entitlement.program_id, entitlement.program_title)}
                        >
                          권한 취소
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!canManageMembers ? (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            코치 계정은 읽기 전용입니다. 권한 변경/제거는 오너만 수행할 수 있습니다.
          </p>
        ) : null}

        <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
          <div>
            <p className="text-xs text-zinc-500">프로그램 접근권 부여</p>
            <p className="mt-1 text-sm font-medium text-zinc-900">{selectedUser.email || "이메일 없음"}</p>
            <p className="mt-1 text-xs text-zinc-500">
              선택한 프로그램 접근권을 추가하고, 기본 테넌트 역할(멤버/코치)을 함께 설정합니다.
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
                <option value="member">멤버</option>
                <option value="coach">코치</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="selected-user-grant-program">대상 프로그램</Label>
              {hasPrograms ? (
                <select
                  id="selected-user-grant-program"
                  value={grantProgramId}
                  onChange={(event) => {
                    const nextProgramId = event.target.value;
                    const nextProgram = programs.find((program) => program.id === nextProgramId);
                    setGrantProgramId(nextProgramId);
                    setGrantCohortId(nextProgram?.cohorts.find((cohort) => cohort.is_default)?.id ?? nextProgram?.cohorts[0]?.id ?? "");
                  }}
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

          {shouldShowCohortSelect ? (
            <div className="space-y-2">
              <Label htmlFor="selected-user-grant-cohort">기수 선택</Label>
              {grantCohorts.length > 0 ? (
                <select
                  id="selected-user-grant-cohort"
                  value={grantCohortId}
                  onChange={(event) => setGrantCohortId(event.target.value)}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                  disabled={isPending || !canManageMembers}
                >
                  {grantCohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name} ({cohort.starts_on})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  이 프로그램에 등록된 기수가 없습니다.
                </p>
              )}
            </div>
          ) : null}

          <Button
            type="button"
            variant="outline"
            disabled={
              isPending ||
              !canManageMembers ||
              !hasPrograms ||
              !selectedUser.email ||
              !grantProgramId ||
              (shouldShowCohortSelect && !grantCohortId)
            }
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
            {selectedUser.has_membership === false ? (
              <p className="mt-1 text-xs text-amber-700">멤버십이 없는 사용자입니다. 먼저 위에서 프로그램 접근권을 부여해 주세요.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as "owner" | "coach" | "member")}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 sm:w-40"
              disabled={isPending || !canManageMembers || selectedUser.has_membership === false}
            >
              <option value="member">멤버</option>
              <option value="coach">코치</option>
              <option value="owner">오너</option>
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !canManageMembers || selectedUser.has_membership === false || selectedUser.role === selectedRole}
              onClick={() => handleChangeRole(selectedUser.id, selectedRole)}
              className="w-full sm:w-auto"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "처리 중..." : "역할 저장"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
          닫기
        </Button>
      </div>

    </>
  );
}

export function AllUsersManager({
  users,
  programs,
  total,
  page,
  pageSize,
  totalPages,
  query,
  selectedProgramId,
  sortBy,
  order,
  canManageMembers,
  nowTimestamp,
}: AllUsersManagerProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const tenantSlug = useTenantSlug();
  const [searchValue, setSearchValue] = useState(query);
  const [selectedUser, setSelectedUser] = useState<ManagedUserRow | null>(null);
  const [previewUser, setPreviewUser] = useState<ManagedUserRow | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateUser, setCandidateUser] = useState<AdminTenantUserCandidate | null>(null);
  const [candidateFeedback, setCandidateFeedback] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"owner" | "coach" | "member">("member");
  const [grantRole, setGrantRole] = useState<"coach" | "member">("member");
  const [grantProgramId, setGrantProgramId] = useState(programs[0]?.id ?? "");
  const [grantCohortId, setGrantCohortId] = useState(programs[0]?.cohorts.find((cohort) => cohort.is_default)?.id ?? programs[0]?.cohorts[0]?.id ?? "");
  const hasPrograms = programs.length > 0;

  const openUserDialog = (user: ManagedUserRow) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setGrantRole("member");
    setGrantProgramId(programs[0]?.id ?? "");
    setGrantCohortId(programs[0]?.cohorts.find((cohort) => cohort.is_default)?.id ?? programs[0]?.cohorts[0]?.id ?? "");
  };

  const handleAvatarPreview = (user: ManagedUserRow) => {
    if (!user.avatar_url) {
      return;
    }

    setPreviewUser(user);
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
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
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

  const handleProgramChange = (nextProgramId: string) => {
    pushWithParams({ programId: nextProgramId === "all" ? null : nextProgramId, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleChangeRole = (userId: string, role: "owner" | "coach" | "member") => {
    if (!canManageMembers) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
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
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("email", selectedUser.email);
    formData.set("role", grantRole);
    formData.set("programId", grantProgramId);
    formData.set("cohortId", grantCohortId);

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

  const handleUpdateEntitlementEndDate = (entitlement: ManagedUserProgramEntitlement, formData: FormData) => {
    if (!selectedUser) {
      toast.error("선택한 유저가 없습니다.");
      return;
    }

    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("entitlementId", entitlement.id);

    startTransition(async () => {
      const result = await updateProgramEntitlementEndDateAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();

        const nextEndsAtInput = String(formData.get("endsAt") ?? "").trim();
        const nextEndsAt = nextEndsAtInput ? new Date(nextEndsAtInput).toISOString() : entitlement.ends_at ?? new Date().toISOString();
        const nextNowTimestamp = Date.now();

        setSelectedUser((current) => {
          if (!current || current.id !== selectedUser.id) {
            return current;
          }

          const nextEntitlements = (current.program_entitlements ?? []).map((item) => {
            if (item.id !== entitlement.id) {
              return item;
            }

            return {
              ...item,
              ends_at: nextEndsAt,
              is_active: new Date(nextEndsAt).getTime() >= nextNowTimestamp,
            };
          });

          const updatedEntitlement = nextEntitlements.find((item) => item.id === entitlement.id);
          const updatedStatus = updatedEntitlement ? getProgramEntitlementStatus(updatedEntitlement, nextNowTimestamp).label : null;
          const nextActiveProgramId =
            current.active_program_id === entitlement.program_id && updatedStatus !== "활성"
              ? nextEntitlements.find((item) => isRevocableEntitlement(item, nextNowTimestamp))?.program_id ?? null
              : current.active_program_id;

          return {
            ...current,
            active_program_id: nextActiveProgramId,
            program_entitlements: nextEntitlements,
          };
        });
        return;
      }

      toast.error(result.message);
    });
  };

  const handleRevokeProgramAccess = (programId: string, programTitle: string) => {
    if (!selectedUser) {
      toast.error("선택한 유저가 없습니다.");
      return;
    }

    const shouldRevoke = window.confirm(`${selectedUser.full_name || selectedUser.email || "선택한 유저"}의 ${programTitle} 권한을 취소할까요?`);
    if (!shouldRevoke) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("userId", selectedUser.id);
    formData.set("programId", programId);

    startTransition(async () => {
      const result = await revokeProgramAccessAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        setSelectedUser((current) => {
          if (!current || current.id !== selectedUser.id) {
            return current;
          }

          const nextEntitlements = (current.program_entitlements ?? []).map((entitlement) => {
            if (entitlement.program_id !== programId || !isRevocableEntitlement(entitlement, nowTimestamp)) {
              return entitlement;
            }

            return {
              ...entitlement,
              is_active: false,
            };
          });

          const nextActiveProgramId =
            current.active_program_id === programId
              ? nextEntitlements.find((entitlement) => isRevocableEntitlement(entitlement, nowTimestamp))?.program_id ?? null
              : current.active_program_id;

          return {
            ...current,
            active_program_id: nextActiveProgramId,
            program_entitlements: nextEntitlements,
          };
        });
        return;
      }

      toast.error(result.message);
    });
  };

  const handleSelectedUserOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedUser(null);
    }
  };

  const resetAddUserDialog = () => {
    setCandidateEmail("");
    setCandidateUser(null);
    setCandidateFeedback(null);
  };

  const handleAddUserDialogOpenChange = (open: boolean) => {
    setIsAddUserDialogOpen(open);

    if (!open) {
      resetAddUserDialog();
    }
  };

  const handleSearchTenantUserCandidate = () => {
    const normalizedEmail = candidateEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("유효한 이메일을 입력해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("email", normalizedEmail);

    startTransition(async () => {
      const result = await searchTenantUserCandidateByEmailAction(formData);
      if (!result.ok) {
        setCandidateUser(null);
        setCandidateFeedback(null);
        toast.error(result.message);
        return;
      }

      setCandidateUser(result.user);
      setCandidateFeedback(result.message);
    });
  };

  const handleAddTenantMember = () => {
    const normalizedEmail = candidateEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      toast.error("유효한 이메일을 입력해 주세요.");
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("email", normalizedEmail);

    startTransition(async () => {
      const result = await addTenantMemberByEmailAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
      setIsAddUserDialogOpen(false);
      resetAddUserDialog();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_220px_170px_130px_130px]">
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

        <Select value={selectedProgramId || "all"} onValueChange={handleProgramChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="전체 프로그램" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 프로그램</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">{summaryText}</p>
        <div className="flex items-center gap-2">
          {canManageMembers ? (
            <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(true)}>
              <UserPlus className="size-4" />
              유저 추가
            </Button>
          ) : null}
          {!canManageMembers ? <Badge variant="outline">Coach 읽기 전용</Badge> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">프로필</TableHead>
              <TableHead className="px-3">이름</TableHead>
              <TableHead className="px-3">이메일</TableHead>
              {selectedProgramId ? <TableHead className="px-3">선택 프로그램 상태</TableHead> : null}
              <TableHead className="px-3">권한</TableHead>
              <TableHead className="px-3">계정상태</TableHead>
              <TableHead className="px-3">인증상태</TableHead>
              <TableHead className="px-3">최근 로그인</TableHead>
              <TableHead className="px-3">가입일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectedProgramId ? 9 : 8} className="px-3 py-8 text-center text-zinc-500">
                  조회된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const selectedProgramStatus = selectedProgramId
                  ? getProgramFilterStatus(user, selectedProgramId, nowTimestamp)
                  : null;

                return (
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
                    <TableCell className="px-3">
                      <Avatar className="size-8">
                        <AvatarImage src={user.avatar_url ?? undefined} alt={`${user.full_name} 프로필`} />
                        <AvatarFallback>{getInitial(user.full_name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="px-3 font-medium text-zinc-900">{user.full_name}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{user.email || "-"}</TableCell>
                    {selectedProgramId ? (
                      <TableCell className="px-3">
                        {selectedProgramStatus ? (
                          <Badge variant="outline" className={selectedProgramStatus.className}>
                            {selectedProgramStatus.label}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-3">
                      <Badge
                        variant="outline"
                        className={user.has_membership === false ? undefined : getRoleBadgeClass(user.role)}
                      >
                        {getMembershipLabel(user)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant="outline" className={getAccountStatus(user).className}>
                        {getAccountStatus(user).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={user.email_confirmed ? "default" : "outline"}>{user.email_confirmed ? "활성" : "미인증"}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(user.last_sign_in_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(user.created_at)}</TableCell>
                  </TableRow>
                );
              })
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

      <Dialog open={isAddUserDialogOpen} onOpenChange={handleAddUserDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>유저 추가</DialogTitle>
            <DialogDescription>
              보안상 전체 유저 조회는 지원하지 않습니다. 가입된 이메일을 정확히 입력해 테넌트 멤버를 추가해 주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-user-email">이메일</Label>
              <div className="flex gap-2">
                <Input
                  id="tenant-user-email"
                  value={candidateEmail}
                  onChange={(event) => setCandidateEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearchTenantUserCandidate();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleSearchTenantUserCandidate} disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "검색"}
                </Button>
              </div>
            </div>

            {candidateFeedback ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{candidateFeedback}</div>
            ) : (
              <p className="text-sm text-zinc-500">앱 가입은 완료했지만 아직 이 테넌트에 등록되지 않은 유저를 이메일로 찾아 추가할 수 있습니다.</p>
            )}

            {candidateUser ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={candidateUser.avatar_url ?? undefined} alt={`${candidateUser.full_name} 프로필`} />
                    <AvatarFallback>{getInitial(candidateUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{candidateUser.full_name}</p>
                      <Badge variant="outline" className={candidateUser.already_member ? "border-amber-300 bg-amber-100 text-amber-800" : "border-emerald-300 bg-emerald-100 text-emerald-800"}>
                        {candidateUser.already_member ? "이미 등록됨" : "추가 가능"}
                      </Badge>
                    </div>
                    <p className="break-all text-sm text-zinc-600">{candidateUser.email}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleAddUserDialogOpenChange(false)}>
              닫기
            </Button>
            <Button type="button" onClick={handleAddTenantMember} disabled={isPending || !candidateUser || candidateUser.already_member}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              테넌트 유저로 추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Drawer open={Boolean(selectedUser)} onOpenChange={handleSelectedUserOpenChange}>
          <DrawerContent className="max-h-[92vh] gap-0 p-0">
            <DrawerHeader className="border-b border-zinc-200 pr-12">
              <DrawerTitle>유저 상세</DrawerTitle>
              <DrawerDescription>유저 정보를 확인하고 멤버 권한 액션을 수행할 수 있습니다.</DrawerDescription>
            </DrawerHeader>
            {selectedUser ? (
              <UserDetailsContent
                selectedUser={selectedUser}
                selectedRole={selectedRole}
                grantRole={grantRole}
                grantProgramId={grantProgramId}
                grantCohortId={grantCohortId}
                programs={programs}
                hasPrograms={hasPrograms}
                isPending={isPending}
                canManageMembers={canManageMembers}
                nowTimestamp={nowTimestamp}
                setGrantRole={setGrantRole}
                setGrantProgramId={setGrantProgramId}
                setGrantCohortId={setGrantCohortId}
                setSelectedRole={setSelectedRole}
                handleGrantForSelectedUser={handleGrantForSelectedUser}
                handleUpdateEntitlementEndDate={handleUpdateEntitlementEndDate}
                handleRevokeProgramAccess={handleRevokeProgramAccess}
                handleChangeRole={handleChangeRole}
                handleAvatarPreview={handleAvatarPreview}
                onClose={() => setSelectedUser(null)}
              />
            ) : null}
            <DrawerFooter className="hidden" />
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedUser)} onOpenChange={handleSelectedUserOpenChange}>
          <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl">
            <SheetHeader className="border-b border-zinc-200 pr-12">
              <SheetTitle>유저 상세</SheetTitle>
              <SheetDescription>유저 정보를 확인하고 멤버 권한 액션을 수행할 수 있습니다.</SheetDescription>
            </SheetHeader>
            {selectedUser ? (
              <UserDetailsContent
                selectedUser={selectedUser}
                selectedRole={selectedRole}
                grantRole={grantRole}
                grantProgramId={grantProgramId}
                grantCohortId={grantCohortId}
                programs={programs}
                hasPrograms={hasPrograms}
                isPending={isPending}
                canManageMembers={canManageMembers}
                nowTimestamp={nowTimestamp}
                setGrantRole={setGrantRole}
                setGrantProgramId={setGrantProgramId}
                setGrantCohortId={setGrantCohortId}
                setSelectedRole={setSelectedRole}
                handleGrantForSelectedUser={handleGrantForSelectedUser}
                handleUpdateEntitlementEndDate={handleUpdateEntitlementEndDate}
                handleRevokeProgramAccess={handleRevokeProgramAccess}
                handleChangeRole={handleChangeRole}
                handleAvatarPreview={handleAvatarPreview}
                onClose={() => setSelectedUser(null)}
              />
            ) : null}
            <SheetFooter className="hidden" />
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={Boolean(previewUser)} onOpenChange={(open) => (!open ? setPreviewUser(null) : null)}>
        <DialogContent showCloseButton={false} className="max-w-[min(92vw,32rem)] border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{previewUser?.full_name ?? "유저"} 프로필 사진</DialogTitle>
          {previewUser?.avatar_url ? (
            <div className="mx-auto relative aspect-square w-full max-w-[min(92vw,28rem)] overflow-hidden rounded-full bg-zinc-950">
              <Image
                src={previewUser.avatar_url}
                alt={`${previewUser.full_name} 프로필 확대 이미지`}
                fill
                sizes="(max-width: 640px) 92vw, 28rem"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
