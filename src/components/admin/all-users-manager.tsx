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
import { DURATION_PASS_MONTHS, formatDurationPassLabel, type DurationPassMonths } from "@/lib/store/duration-options";
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
import { Textarea } from "@/components/ui/textarea";
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
import type { AdminTenantUserCandidate, ManagedUserProgramEntitlement, ManagedUserRoleFilter, ManagedUserRow, ManagedUserSortBy, SortOrder } from "@/lib/admin/types";

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
  selectedRoleFilter: ManagedUserRoleFilter;
  sortBy: ManagedUserSortBy;
  order: SortOrder;
  canManageMembers: boolean;
  nowTimestamp: number;
};

type UserDetailsContentProps = {
  selectedUser: ManagedUserRow;
  selectedRole: "owner" | "manager" | "coach" | "member";
  grantRole: "coach" | "member";
  grantProgramId: string;
  grantCohortId: string;
  grantStartsOn: string;
  grantDurationMonths: DurationPassMonths;
  programs: UserGrantProgramOption[];
  hasPrograms: boolean;
  isPending: boolean;
  canManageMembers: boolean;
  nowTimestamp: number;
  setGrantRole: (role: "coach" | "member") => void;
  setGrantProgramId: (programId: string) => void;
  setGrantCohortId: (cohortId: string) => void;
  setGrantStartsOn: (startsOn: string) => void;
  setGrantDurationMonths: (durationMonths: DurationPassMonths) => void;
  setSelectedRole: (role: "owner" | "manager" | "coach" | "member") => void;
  handleGrantForSelectedUser: () => void;
  handleUpdateEntitlementEndDate: (entitlement: ManagedUserProgramEntitlement, formData: FormData) => void;
  handleRevokeProgramAccess: (programId: string | null, programTitle: string) => void;
  handleChangeRole: (userId: string, role: "owner" | "manager" | "coach" | "member") => void;
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

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRoleLabel(role: "owner" | "manager" | "coach" | "member") {
  if (role === "manager") return "매니저";
  if (role === "owner") return "오너";
  if (role === "coach") return "코치";
  return "멤버";
}

function getRoleBadgeAppearance(role: "owner" | "manager" | "coach" | "member") {
  if (role === "owner") return "warning" as const;
  if (role === "coach") return "info" as const;
  return "success" as const;
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
      appearance: "critical" as const,
    };
  }

  return {
    label: "활성",
    appearance: "success" as const,
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

function getProgramFilterStatus(user: ManagedUserRow, programId: string, nowTimestamp: number) {
  const entitlement = (user.program_entitlements ?? []).find((item) => item.program_id === programId);
  if (!entitlement) {
    return null;
  }

  const status = getProgramEntitlementStatus(entitlement, nowTimestamp);
  if (status.label === "활성") {
    return {
      label: "활성",
      appearance: "success" as const,
    };
  }

  if (status.label === "만료") {
    return {
      label: "만료",
      appearance: "warning" as const,
    };
  }

  return {
    label: "비활성",
    appearance: "inactive" as const,
  };
}

function formatNullableBoolean(value: boolean | null | undefined) {
  if (value === true) return "네";
  if (value === false) return "아니오";
  return "미응답";
}

function formatNullableText(value: string | null | undefined) {
  return value?.trim() || "미응답";
}


function UserDetailsContent({
  selectedUser,
  selectedRole,
  grantRole,
  grantProgramId,
  grantCohortId,
  grantStartsOn,
  grantDurationMonths,
  programs,
  hasPrograms,
  isPending,
  canManageMembers,
  nowTimestamp,
  setGrantRole,
  setGrantProgramId,
  setGrantCohortId,
  setGrantStartsOn,
  setGrantDurationMonths,
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
  const selectedGrantCohort = grantCohorts.find((cohort) => cohort.id === grantCohortId) ?? null;
  const hyroxProfile = selectedUser.hyrox_profile;

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 text-sm sm:px-6 sm:pb-6">
        <div className="rounded-md border bg-surface-subtle p-3">
          <p className="text-xs text-ink-subtle">프로필</p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAvatarPreview(selectedUser)}
              disabled={!hasAvatar}
              aria-label={hasAvatar ? `${selectedUser.full_name} 프로필 사진 확대` : undefined}
              className={hasAvatar ? "cursor-zoom-in rounded-full" : "cursor-default rounded-full"}
            >
              <Avatar appearance="zoom" className="size-10 hover:scale-105">
                <AvatarImage src={selectedUser.avatar_url ?? undefined} alt={`${selectedUser.full_name} 프로필`} />
                <AvatarFallback>{getInitial(selectedUser.full_name)}</AvatarFallback>
              </Avatar>
            </button>
            <div className="space-y-1">
              <p className="font-medium text-ink">{selectedUser.full_name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" appearance={getAccountStatus(selectedUser).appearance}>
                  {getAccountStatus(selectedUser).label}
                </Badge>
                {selectedUser.deactivated_at ? (
                  <span className="text-xs text-ink-subtle">비활성화: {formatAdminDateTime(selectedUser.deactivated_at)}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-surface-subtle p-3">
          <p className="text-xs text-ink-subtle">이름</p>
          <p className="mt-1 font-medium text-ink">{selectedUser.full_name}</p>
        </div>

        <div className="rounded-md border bg-surface-subtle p-3">
          <p className="text-xs text-ink-subtle">이메일</p>
          <p className="mt-1 font-medium text-ink">{selectedUser.email || "-"}</p>
        </div>

        <div className="rounded-md border bg-surface-subtle p-3">
          <p className="text-xs text-ink-subtle">휴대폰</p>
          <p className="mt-1 font-medium text-ink">{selectedUser.phone_number || "-"}</p>
        </div>

        <div className="space-y-3 rounded-md border bg-surface-subtle p-3">
          <p className="text-xs text-ink-subtle">하이록스 참가 정보</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-white p-3">
              <p className="text-xs text-ink-subtle">XON 멤버이신가요? / Are you member of XON?</p>
              <p className="mt-1 font-medium text-ink">{formatNullableBoolean(hyroxProfile.is_xon_member)}</p>
            </div>
            <div className="rounded-md border border-line bg-white p-3">
              <p className="text-xs text-ink-subtle">하이록스 디비전 / Division of Hyrox</p>
              <p className="mt-1 font-medium text-ink">{formatNullableText(hyroxProfile.hyrox_division)}</p>
            </div>
            <div className="rounded-md border border-line bg-white p-3">
              <p className="text-xs text-ink-subtle">하이록스 출전 경험이 있으신가요? / Have you ever participated in Hyrox race?</p>
              <p className="mt-1 font-medium text-ink">
                {formatNullableBoolean(hyroxProfile.has_hyrox_race_experience)}
              </p>
            </div>
            <div className="rounded-md border border-line bg-white p-3">
              <p className="text-xs text-ink-subtle">하이록스 목표 / Goal of your Hyrox!</p>
              <p className="mt-1 font-medium text-ink">{formatNullableText(hyroxProfile.hyrox_goal)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-surface-subtle p-3">
            <p className="text-xs text-ink-subtle">현재 권한</p>
            <div className="mt-1">
              <Badge
                variant="outline"
                appearance={selectedUser.has_membership === false ? undefined : getRoleBadgeAppearance(selectedUser.role)}
              >
                {getMembershipLabel(selectedUser)}
              </Badge>
            </div>
          </div>
          <div className="rounded-md border bg-surface-subtle p-3">
            <p className="text-xs text-ink-subtle">상태</p>
            <div className="mt-1">
              <Badge variant={selectedUser.email_confirmed ? "default" : "outline"}>
                {selectedUser.email_confirmed ? "활성" : "미인증"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-surface-subtle p-3">
            <p className="text-xs text-ink-subtle">가입일</p>
            <p className="mt-1 font-medium text-ink">{formatAdminDateTime(selectedUser.created_at)}</p>
          </div>
          <div className="rounded-md border bg-surface-subtle p-3">
            <p className="text-xs text-ink-subtle">최근 로그인</p>
            <p className="mt-1 font-medium text-ink">{formatAdminDateTime(selectedUser.last_sign_in_at)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-md border bg-surface-subtle p-3">
          <div>
            <p className="text-xs text-ink-subtle">프로그램 권한</p>
            <p className="mt-1 text-xs text-ink-subtle">활성, 만료, 비활성 권한 이력을 모두 표시합니다.</p>
            {canManageMembers && selectedUser.program_entitlements?.some((item) => item.is_active) ? (
              <Button type="button" variant="destructive" size="sm" className="mt-3" disabled={isPending}
                onClick={() => handleRevokeProgramAccess(null, "전체 멤버십")}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}전체 멤버십 해제
              </Button>
            ) : null}
          </div>

          {(selectedUser.program_entitlements ?? []).length === 0 ? (
            <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink-muted">
              부여된 프로그램 권한이 없습니다.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {(selectedUser.program_entitlements ?? []).map((entitlement) => {
                const status = getProgramEntitlementStatus(entitlement, nowTimestamp);
                const isCurrentProgram = selectedUser.active_program_id === entitlement.program_id;
                const canRevokeEntitlement = canManageMembers && entitlement.is_active;

                return (
                  <div
                    key={entitlement.id}
                    className="rounded-md border border-line bg-white px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-ink">{entitlement.program_title}</p>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {entitlement.cohort_name ? <Badge variant="outline">{entitlement.cohort_name}</Badge> : null}
                          {isCurrentProgram ? <Badge variant="secondary">현재 선택 프로그램</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-ink-subtle">
                          시작: {formatAdminDateTime(entitlement.starts_at)} / 종료: {formatAdminDateTime(entitlement.ends_at)}
                        </p>
                        {canManageMembers && entitlement.is_active ? (
                          <form
                            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                            onSubmit={(event) => handleEntitlementEndDateSubmit(event, entitlement)}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <Label htmlFor={`entitlement-end-${entitlement.id}`} className="text-xs text-ink-subtle">
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
                              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}종료일 저장
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
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}권한 취소
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(selectedUser.membership_admin_events ?? []).length > 0 ? (
          <section className="space-y-2 rounded-md border bg-surface-subtle p-3" aria-label="멤버십 처리 이력">
            <h3 className="text-sm font-medium">멤버십 처리 이력</h3>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {selectedUser.membership_admin_events?.map((event) => (
                <div key={event.id} className="rounded-md border bg-white p-3 text-xs">
                  <p className="font-medium">{event.program_title} · {event.action === "revoke" ? "해제" : "종료일 변경"}</p>
                  {event.reason ? <p className="mt-1 whitespace-pre-wrap break-words">사유: {event.reason}</p> : null}
                  {event.action === "end_date" ? <p className="mt-1">{formatAdminDateTime(event.previous_ends_at)} → {formatAdminDateTime(event.next_ends_at)}</p> : null}
                  <p className="mt-1 text-ink-subtle">{event.changed_by_name} · {formatAdminDateTime(event.created_at)}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!canManageMembers ? (
          <p className="rounded-md border border-line bg-surface-subtle px-3 py-2 text-xs text-ink-muted">
            코치 계정은 읽기 전용입니다. 권한 변경/제거는 오너만 수행할 수 있습니다.
          </p>
        ) : null}

        <div className="space-y-3 rounded-md border bg-surface-subtle p-3">
          <div>
            <p className="text-xs text-ink-subtle">프로그램 접근권 부여</p>
            <p className="mt-1 text-sm font-medium text-ink">{selectedUser.email || "이메일 없음"}</p>
            <p className="mt-1 text-xs text-ink-subtle">
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
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
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
                    const nextCohort = nextProgram?.cohorts.find((cohort) => cohort.is_default) ?? nextProgram?.cohorts[0] ?? null;
                    setGrantProgramId(nextProgramId);
                    setGrantCohortId(nextCohort?.id ?? "");
                    setGrantStartsOn(nextProgram?.deliveryMode === "cohort_based" && nextCohort ? nextCohort.starts_on : toDateKey(new Date(nowTimestamp)));
                  }}
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                  disabled={isPending || !canManageMembers}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink-muted">
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
                  onChange={(event) => {
                    const nextCohortId = event.target.value;
                    const nextCohort = grantCohorts.find((cohort) => cohort.id === nextCohortId);
                    setGrantCohortId(nextCohortId);
                    if (nextCohort) {
                      setGrantStartsOn(nextCohort.starts_on);
                    }
                  }}
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                  disabled={isPending || !canManageMembers}
                >
                  {grantCohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name} ({cohort.starts_on})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-md border border-warning-line bg-warning-surface px-3 py-2 text-sm text-warning-deep">
                  이 프로그램에 등록된 기수가 없습니다.
                </p>
              )}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="selected-user-grant-starts-on">멤버쉽 시작일</Label>
              <Input
                id="selected-user-grant-starts-on"
                type="date"
                value={grantStartsOn}
                onChange={(event) => setGrantStartsOn(event.target.value)}
                disabled={isPending || !canManageMembers}
                required
              />
              {shouldShowCohortSelect && selectedGrantCohort ? (
                <p className="text-xs text-ink-subtle">선택한 기수 시작일: {selectedGrantCohort.starts_on}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="selected-user-grant-duration">멤버쉽 기간</Label>
              <select
                id="selected-user-grant-duration"
                value={String(grantDurationMonths)}
                onChange={(event) => setGrantDurationMonths(Number(event.target.value) as DurationPassMonths)}
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                disabled={isPending || !canManageMembers}
              >
                {DURATION_PASS_MONTHS.map((durationMonths) => (
                  <option key={durationMonths} value={durationMonths}>
                    {formatDurationPassLabel(durationMonths)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={
              isPending ||
              !canManageMembers ||
              !hasPrograms ||
              !selectedUser.email ||
              !grantProgramId ||
              !grantStartsOn ||
              (shouldShowCohortSelect && !grantCohortId)
            }
            onClick={handleGrantForSelectedUser}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "처리 중..." : "프로그램 접근권 부여"}
          </Button>
        </div>

        <div className="space-y-3 rounded-md border bg-surface-subtle p-3">
          <div>
            <p className="text-xs text-ink-subtle">테넌트 역할 변경</p>
            <p className="mt-1 text-xs text-ink-subtle">프로그램 접근권은 유지되고, 테넌트 역할만 변경됩니다.</p>
            {selectedUser.has_membership === false ? (
              <p className="mt-1 text-xs text-warning-ink">멤버십이 없는 사용자입니다. 먼저 위에서 프로그램 접근권을 부여해 주세요.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as "owner" | "manager" | "coach" | "member")}
              className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink sm:w-40"
              disabled={isPending || !canManageMembers || selectedUser.has_membership === false}
            >
              <option value="member">멤버</option>
              <option value="coach">코치</option>
              <option value="owner">오너</option>
              <option value="manager">매니저</option>
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

      <div className="border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
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
  selectedRoleFilter,
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
  const [selectedUserSnapshot, setSelectedUser] = useState<ManagedUserRow | null>(null);
  // Refreshes include the authoritative selection and audit trail from the transaction.
  const selectedUser = users.find((user) => user.id === selectedUserSnapshot?.id) ?? selectedUserSnapshot;
  const [revokeTarget, setRevokeTarget] = useState<{ programId: string | null; title: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [previewUser, setPreviewUser] = useState<ManagedUserRow | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidateUser, setCandidateUser] = useState<AdminTenantUserCandidate | null>(null);
  const [candidateFeedback, setCandidateFeedback] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"owner" | "manager" | "coach" | "member">("member");
  const [grantRole, setGrantRole] = useState<"coach" | "member">("member");
  const [grantProgramId, setGrantProgramId] = useState(programs[0]?.id ?? "");
  const [grantCohortId, setGrantCohortId] = useState(programs[0]?.cohorts.find((cohort) => cohort.is_default)?.id ?? programs[0]?.cohorts[0]?.id ?? "");
  const [grantStartsOn, setGrantStartsOn] = useState(
    programs[0]?.deliveryMode === "cohort_based"
      ? programs[0]?.cohorts.find((cohort) => cohort.is_default)?.starts_on ?? programs[0]?.cohorts[0]?.starts_on ?? toDateKey(new Date(nowTimestamp))
      : toDateKey(new Date(nowTimestamp))
  );
  const [grantDurationMonths, setGrantDurationMonths] = useState<DurationPassMonths>(1);
  const hasPrograms = programs.length > 0;

  const openUserDialog = (user: ManagedUserRow) => {
    const initialProgram = programs[0] ?? null;
    const initialCohort = initialProgram?.cohorts.find((cohort) => cohort.is_default) ?? initialProgram?.cohorts[0] ?? null;

    setSelectedUser(user);
    setSelectedRole(user.role);
    setGrantRole("member");
    setGrantProgramId(initialProgram?.id ?? "");
    setGrantCohortId(initialCohort?.id ?? "");
    setGrantStartsOn(initialProgram?.deliveryMode === "cohort_based" && initialCohort ? initialCohort.starts_on : toDateKey(new Date(nowTimestamp)));
    setGrantDurationMonths(1);
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

  const handleChangeRole = (userId: string, role: "owner" | "manager" | "coach" | "member") => {
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
    formData.set("startsOn", grantStartsOn);
    formData.set("durationMonths", String(grantDurationMonths));

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

        return;
      }

      toast.error(result.message);
    });
  };

  const handleRevokeProgramAccess = (programId: string | null, title: string) => {
    setRevokeReason("");
    setRevokeTarget({ programId, title });
  };

  const confirmRevoke = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser || !revokeTarget || isPending) return;
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("userId", selectedUser.id);
    formData.set("reason", revokeReason);
    if (revokeTarget.programId) formData.set("programId", revokeTarget.programId);
    else formData.set("revokeAll", "true");
    startTransition(async () => {
      try {
        const result = await revokeProgramAccessAction(formData);
        if (!result.ok) { toast.error(result.message); return; }
        toast.success(result.message);
        setRevokeTarget(null);
        router.refresh();
      } catch {
        toast.error("처리 결과를 확인하지 못했습니다. 새로고침하여 멤버십 상태를 확인해 주세요.");
      }
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
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-5">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="이름, 이메일 또는 휴대폰 번호 검색"
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

        <Select
          value={selectedRoleFilter}
          onValueChange={(role) => pushWithParams({ role: role === "all" ? null : role, page: "1" })}
        >
          <SelectTrigger className="w-full" aria-label="권한 필터">
            <SelectValue placeholder="전체 권한" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 권한</SelectItem>
            <SelectItem value="owner">오너</SelectItem>
            <SelectItem value="manager">매니저</SelectItem>
            <SelectItem value="coach">코치</SelectItem>
            <SelectItem value="member">멤버</SelectItem>
            <SelectItem value="unregistered">미등록</SelectItem>
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
        <p className="text-xs text-ink-subtle">{summaryText}</p>
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

      <div className="overflow-hidden rounded-lg border border-line">
        <Table>
          <TableHeader className="bg-surface-subtle text-ink-muted">
            <TableRow>
              <TableHead className="px-3">프로필</TableHead>
              <TableHead className="px-3">이름</TableHead>
              <TableHead className="px-3">휴대폰</TableHead>
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
                <TableCell colSpan={selectedProgramId ? 9 : 8} className="px-3 py-8 text-center text-ink-subtle">
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
                    <TableCell className="px-3 font-medium text-ink">{user.full_name}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{user.phone_number || "-"}</TableCell>
                    {selectedProgramId ? (
                      <TableCell className="px-3">
                        {selectedProgramStatus ? (
                          <Badge variant="outline" appearance={selectedProgramStatus.appearance}>
                            {selectedProgramStatus.label}
                          </Badge>
                        ) : (
                          <span className="text-ink-faint">-</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-3">
                      <Badge
                        variant="outline"
                        appearance={user.has_membership === false ? undefined : getRoleBadgeAppearance(user.role)}
                      >
                        {getMembershipLabel(user)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant="outline" appearance={getAccountStatus(user).appearance}>
                        {getAccountStatus(user).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={user.email_confirmed ? "default" : "outline"}>{user.email_confirmed ? "활성" : "미인증"}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(user.last_sign_in_at)}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(user.created_at)}</TableCell>
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
              disabled={page <= 1}
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
              disabled={page >= totalPages}
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
              <div className="rounded-lg border border-line bg-surface-subtle px-3 py-2 text-sm text-ink-secondary">{candidateFeedback}</div>
            ) : (
              <p className="text-sm text-ink-subtle">앱 가입은 완료했지만 아직 이 테넌트에 등록되지 않은 유저를 이메일로 찾아 추가할 수 있습니다.</p>
            )}

            {candidateUser ? (
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={candidateUser.avatar_url ?? undefined} alt={`${candidateUser.full_name} 프로필`} />
                    <AvatarFallback>{getInitial(candidateUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{candidateUser.full_name}</p>
                      <Badge variant="outline" appearance={candidateUser.already_member ? "warning" : "success"}>
                        {candidateUser.already_member ? "이미 등록됨" : "추가 가능"}
                      </Badge>
                    </div>
                    <p className="break-all text-sm text-ink-muted">{candidateUser.email}</p>
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
          <DrawerContent className="max-h-dialog-full gap-0 p-0">
            <DrawerHeader className="border-b border-line pr-12">
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
                grantStartsOn={grantStartsOn}
                grantDurationMonths={grantDurationMonths}
                programs={programs}
                hasPrograms={hasPrograms}
                isPending={isPending}
                canManageMembers={canManageMembers}
                nowTimestamp={nowTimestamp}
                setGrantRole={setGrantRole}
                setGrantProgramId={setGrantProgramId}
                setGrantCohortId={setGrantCohortId}
                setGrantStartsOn={setGrantStartsOn}
                setGrantDurationMonths={setGrantDurationMonths}
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
            <SheetHeader className="border-b border-line pr-12">
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
                grantStartsOn={grantStartsOn}
                grantDurationMonths={grantDurationMonths}
                programs={programs}
                hasPrograms={hasPrograms}
                isPending={isPending}
                canManageMembers={canManageMembers}
                nowTimestamp={nowTimestamp}
                setGrantRole={setGrantRole}
                setGrantProgramId={setGrantProgramId}
                setGrantCohortId={setGrantCohortId}
                setGrantStartsOn={setGrantStartsOn}
                setGrantDurationMonths={setGrantDurationMonths}
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

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open && !isPending) setRevokeTarget(null); }}>
        <DialogContent>
          <form onSubmit={confirmRevoke} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{revokeTarget?.title} 해제</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name}님의 {revokeTarget?.title} 이용 권한을 해제합니다.
                예정된 멤버십도 포함되며, 사유와 처리자가 기록됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="membership-revoke-reason">해제 사유</Label>
              <Textarea id="membership-revoke-reason" required maxLength={500} value={revokeReason}
                disabled={isPending} onChange={(event) => setRevokeReason(event.target.value)} placeholder="예: 회원 요청으로 이용 중단" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={isPending} onClick={() => setRevokeTarget(null)}>취소</Button>
              <Button type="submit" variant="destructive" disabled={isPending || !revokeReason.trim()}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}{isPending ? "해제 중..." : "멤버십 해제"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewUser)} onOpenChange={(open) => (!open ? setPreviewUser(null) : null)}>
        <DialogContent showCloseButton={false} appearance="image" className="max-w-dialog">
          <DialogTitle className="sr-only">{previewUser?.full_name ?? "유저"} 프로필 사진</DialogTitle>
          {previewUser?.avatar_url ? (
            <div className="mx-auto relative aspect-square w-full max-w-dialog-sm overflow-hidden rounded-full bg-ink-emphasis">
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
