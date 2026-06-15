"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import { grantMembershipFromAdminAction, updateProgramApplicationStatusAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAdminDateTime } from "@/lib/admin/format";
import type {
  AdminMembershipGrantPeriodType,
  AdminMembershipGrantProgramOption,
  AdminMembershipGrantUserRow,
  AdminMembershipGrantView,
  AdminProgramApplicationRow,
  ProgramApplicationStatus,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type MembershipGrantsManagerProps = {
  view: AdminMembershipGrantView;
  applications: AdminProgramApplicationRow[];
  users: AdminMembershipGrantUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  programs: AdminMembershipGrantProgramOption[];
  canGrantMembership: boolean;
};

const PERIOD_OPTIONS: Array<{ value: AdminMembershipGrantPeriodType; label: string }> = [
  { value: "program_period", label: "프로그램 기간" },
  { value: "1", label: "1개월" },
  { value: "2", label: "2개월" },
  { value: "3", label: "3개월" },
  { value: "6", label: "6개월" },
];

function getStatusMeta(status: ProgramApplicationStatus) {
  if (status === "approved") {
    return { label: "승인", variant: "default" as const, className: "border-emerald-300 bg-emerald-100 text-emerald-800" };
  }

  if (status === "rejected") {
    return { label: "거절", variant: "destructive" as const, className: "border-rose-300 bg-rose-100 text-rose-800" };
  }

  if (status === "canceled") {
    return { label: "취소", variant: "outline" as const, className: "border-zinc-300 bg-zinc-100 text-zinc-700" };
  }

  return { label: "대기", variant: "secondary" as const, className: "border-amber-300 bg-amber-100 text-amber-800" };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function getRoleLabel(role: "owner" | "coach" | "member") {
  if (role === "owner") return "오너";
  if (role === "coach") return "코치";
  return "멤버";
}

function getRoleBadgeClass(role: "owner" | "coach" | "member" | null) {
  if (role === "owner") return "border-amber-300 bg-amber-100 text-amber-800";
  if (role === "coach") return "border-sky-300 bg-sky-100 text-sky-800";
  if (role === "member") return "border-emerald-300 bg-emerald-100 text-emerald-800";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
}

function GrantControls({
  userId,
  defaultProgramId,
  applicationId,
  lockProgram = false,
  submitLabel = "멤버쉽 부여",
  stacked = false,
  onSuccess,
  programs,
  canGrantMembership,
}: {
  userId: string;
  defaultProgramId?: string;
  applicationId?: string;
  lockProgram?: boolean;
  submitLabel?: string;
  stacked?: boolean;
  onSuccess?: () => void;
  programs: AdminMembershipGrantProgramOption[];
  canGrantMembership: boolean;
}) {
  const router = useRouter();
  const tenantSlug = useTenantSlug();
  const initialProgramId = defaultProgramId && programs.some((program) => program.id === defaultProgramId) ? defaultProgramId : programs[0]?.id ?? "";
  const [programId, setProgramId] = useState(initialProgramId);
  const [periodType, setPeriodType] = useState<AdminMembershipGrantPeriodType>("program_period");
  const [cohortId, setCohortId] = useState("default");
  const [isPending, startTransition] = useTransition();
  const selectedProgram = programs.find((program) => program.id === programId);
  const showCohorts = selectedProgram?.deliveryMode === "cohort_based" && selectedProgram.cohorts.length > 0;

  const handleGrant = () => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("userId", userId);
    formData.set("programId", programId);
    formData.set("periodType", periodType);
    if (applicationId) formData.set("applicationId", applicationId);
    if (showCohorts && cohortId !== "default") formData.set("cohortId", cohortId);

    startTransition(async () => {
      const result = await grantMembershipFromAdminAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <div className={stacked ? "space-y-3" : "flex flex-wrap items-center gap-2"}>
      {!lockProgram ? (
        <Select value={programId} onValueChange={(nextProgramId) => {
          setProgramId(nextProgramId);
          setCohortId("default");
        }}>
          <SelectTrigger className={stacked ? "w-full" : "h-8 w-[180px]"}>
            <SelectValue placeholder="프로그램" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select value={periodType} onValueChange={(nextPeriodType) => setPeriodType(nextPeriodType as AdminMembershipGrantPeriodType)}>
        <SelectTrigger className={stacked ? "w-full" : "h-8 w-[130px]"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCohorts ? (
        <Select value={cohortId} onValueChange={setCohortId}>
          <SelectTrigger className={stacked ? "w-full" : "h-8 w-[130px]"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">기본 기수</SelectItem>
            {selectedProgram.cohorts.map((cohort) => (
              <SelectItem key={cohort.id} value={cohort.id}>
                {cohort.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Button
        type="button"
        size={stacked ? "default" : "sm"}
        className={cn("whitespace-nowrap", stacked ? "w-full" : undefined)}
        disabled={isPending || !canGrantMembership || !programId}
        onClick={handleGrant}
      >
        {isPending ? <Spinner /> : <UserPlus className="size-4" />}
        {submitLabel}
      </Button>
      {!canGrantMembership ? <span className="text-xs text-zinc-500">owner 권한 필요</span> : null}
    </div>
  );
}

function ActionPanelContent({
  application,
  user,
  defaultProgramId,
  programs,
  canGrantMembership,
  onClose,
  onStatusChange,
  isStatusPending,
}: {
  application?: AdminProgramApplicationRow;
  user?: AdminMembershipGrantUserRow;
  defaultProgramId?: string;
  programs: AdminMembershipGrantProgramOption[];
  canGrantMembership: boolean;
  onClose: () => void;
  onStatusChange?: (applicationId: string, nextStatus: ProgramApplicationStatus) => void;
  isStatusPending?: boolean;
}) {
  const targetName = application?.user_name ?? user?.user_name ?? "회원";
  const targetEmail = application?.user_email ?? user?.user_email ?? "";
  const targetPhone = application?.user_phone_number ?? user?.user_phone_number ?? null;
  const targetUserId = application?.user_id ?? user?.user_id ?? "";
  const grantProgramId = application?.program_id ?? defaultProgramId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-4 overflow-y-auto px-4 pb-4">
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-zinc-900">{targetName}</p>
            <p className="text-zinc-500">{targetEmail || targetUserId}</p>
            <p className="text-zinc-500">{targetPhone || "-"}</p>
          </div>
        </div>

        {application ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium text-zinc-500">신청 프로그램</p>
            <p className="font-medium text-zinc-900">{application.program_title}</p>
            <p className="text-zinc-500">{formatAdminDateTime(application.created_at)}</p>
          </div>
        ) : null}

        {user ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium text-zinc-500">현재 멤버쉽</p>
            {user.entitlements.length === 0 ? (
              <p className="text-zinc-500">활성 멤버쉽 없음</p>
            ) : (
              <div className="space-y-2">
                {user.entitlements.slice(0, 3).map((entitlement) => (
                  <div key={entitlement.id} className="rounded-md border border-zinc-200 p-3">
                    <p className="font-medium text-zinc-900">{entitlement.program_title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatAdminDateTime(entitlement.starts_at)} - {formatAdminDateTime(entitlement.ends_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">멤버쉽 부여</p>
          <GrantControls
            userId={targetUserId}
            defaultProgramId={grantProgramId}
            applicationId={application?.id}
            lockProgram={Boolean(application)}
            submitLabel={application ? "승인 및 멤버쉽 부여" : "멤버쉽 부여"}
            stacked
            onSuccess={onClose}
            programs={programs}
            canGrantMembership={canGrantMembership}
          />
        </div>
      </div>

      {application && onStatusChange ? (
        <div className="mt-auto border-t border-zinc-200 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isStatusPending || application.status === "rejected"}
              onClick={() => {
                onStatusChange(application.id, "rejected");
                onClose();
              }}
            >
              거절
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isStatusPending || application.status === "canceled"}
              onClick={() => {
                onStatusChange(application.id, "canceled");
                onClose();
              }}
            >
              취소
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MembershipActionPanel({
  application,
  user,
  defaultProgramId,
  programs,
  canGrantMembership,
  onStatusChange,
  isStatusPending,
  open: controlledOpen,
  onOpenChange,
}: {
  application?: AdminProgramApplicationRow;
  user?: AdminMembershipGrantUserRow;
  defaultProgramId?: string;
  programs: AdminMembershipGrantProgramOption[];
  canGrantMembership: boolean;
  onStatusChange?: (applicationId: string, nextStatus: ProgramApplicationStatus) => void;
  isStatusPending?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const title = application ? "신청 관리" : "멤버쉽 부여";
  const description = application ? "신청을 승인해 멤버쉽을 부여하거나 거절/취소 처리합니다." : "선택한 유저에게 프로그램 멤버쉽을 부여합니다.";
  const trigger = controlledOpen === undefined ? (
    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
      관리
    </Button>
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {trigger}
        <DrawerContent className="max-h-[92vh] gap-0 p-0">
          <DrawerHeader className="border-b border-zinc-200 pr-12">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <ActionPanelContent
            application={application}
            user={user}
            defaultProgramId={defaultProgramId}
            programs={programs}
            canGrantMembership={canGrantMembership}
            onClose={() => setOpen(false)}
            onStatusChange={onStatusChange}
            isStatusPending={isStatusPending}
          />
          <DrawerFooter className="hidden" />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger}
      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-zinc-200 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <ActionPanelContent
          application={application}
          user={user}
          defaultProgramId={defaultProgramId}
          programs={programs}
          canGrantMembership={canGrantMembership}
          onClose={() => setOpen(false)}
          onStatusChange={onStatusChange}
          isStatusPending={isStatusPending}
        />
        <SheetFooter className="hidden" />
      </SheetContent>
    </Sheet>
  );
}

export function MembershipGrantsManager({
  view,
  applications,
  users,
  total,
  page,
  pageSize,
  totalPages,
  query,
  programs,
  canGrantMembership,
}: MembershipGrantsManagerProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const [isPending, startTransition] = useTransition();
  const [selectedApplication, setSelectedApplication] = useState<AdminProgramApplicationRow | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminMembershipGrantUserRow | null>(null);
  const [searchValue, setSearchValue] = useState(query);

  const summaryText = useMemo(() => {
    if (total === 0) return view === "applications" ? "선택한 조건의 프로그램 신청이 없습니다." : "표시할 테넌트 관련 유저가 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total, view]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

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

  const handleStatusChange = (applicationId: string, nextStatus: ProgramApplicationStatus) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("applicationId", applicationId);
    formData.set("status", nextStatus);

    startTransition(async () => {
      const result = await updateProgramApplicationStatusAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const handleSearch = () => {
    pushWithParams({ q: searchValue.trim() || null, page: "1" });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 lg:grid-cols-[1fr_260px_130px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="회원명, 이메일, 휴대폰 또는 프로그램 검색"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <Select value={view} onValueChange={(nextView) => pushWithParams({ view: nextView, page: "1" })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="applications">신청 유저만 보기</SelectItem>
            <SelectItem value="users">전체 유저 보기</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(nextPageSize) => pushWithParams({ pageSize: nextPageSize, page: "1" })}>
          <SelectTrigger className="w-full">
            <SelectValue aria-label={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩</SelectItem>
            <SelectItem value="20">20개씩</SelectItem>
            <SelectItem value="50">50개씩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-zinc-500">{summaryText}</p>

      {view === "applications" ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-zinc-50 text-zinc-600">
              <TableRow>
                <TableHead className="w-[64px] px-3">프로필</TableHead>
                <TableHead className="min-w-[180px] px-3">이름</TableHead>
                <TableHead className="min-w-[130px] px-3">휴대폰</TableHead>
                <TableHead className="min-w-[260px] px-3">프로그램</TableHead>
                <TableHead className="min-w-[90px] px-3">상태</TableHead>
                <TableHead className="min-w-[150px] px-3">신청일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    선택한 조건의 프로그램 신청이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((application) => {
                  const statusMeta = getStatusMeta(application.status);

                  return (
                    <TableRow
                      key={application.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedApplication(application)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedApplication(application);
                        }
                      }}
                    >
                      <TableCell className="px-3">
                        <Avatar className="size-8">
                          <AvatarImage src={application.user_avatar_url ?? undefined} alt={`${application.user_name} 프로필`} />
                          <AvatarFallback>{getInitial(application.user_name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="px-3 text-zinc-900">
                        <div className="space-y-0.5">
                          <p className="font-medium">{application.user_name}</p>
                          <p className="text-xs text-zinc-500">{application.user_email || application.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-zinc-700">{application.user_phone_number || "-"}</TableCell>
                      <TableCell className="px-3 font-medium text-zinc-900">
                        <p className="whitespace-normal">{application.program_title}</p>
                      </TableCell>
                      <TableCell className="px-3">
                        <Badge variant={statusMeta.variant} className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(application.created_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <Table className="min-w-[960px]">
            <TableHeader className="bg-zinc-50 text-zinc-600">
              <TableRow>
                <TableHead className="w-[64px] px-3">프로필</TableHead>
                <TableHead className="min-w-[180px] px-3">이름</TableHead>
                <TableHead className="min-w-[130px] px-3">휴대폰</TableHead>
                <TableHead className="min-w-[110px] px-3">권한</TableHead>
                <TableHead className="min-w-[90px] px-3">신청</TableHead>
                <TableHead className="min-w-[120px] px-3">활성 멤버쉽</TableHead>
                <TableHead className="min-w-[150px] px-3">가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                    표시할 테넌트 관련 유저가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  return (
                    <TableRow
                      key={user.user_id}
                      className="cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedUser(user);
                        }
                      }}
                    >
                      <TableCell className="px-3">
                        <Avatar className="size-8">
                          <AvatarImage src={user.user_avatar_url ?? undefined} alt={`${user.user_name} 프로필`} />
                          <AvatarFallback>{getInitial(user.user_name)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="px-3 text-zinc-900">
                        <div className="space-y-0.5">
                          <p className="font-medium">{user.user_name}</p>
                          <p className="text-xs text-zinc-500">{user.user_email || user.user_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-zinc-700">{user.user_phone_number || "-"}</TableCell>
                      <TableCell className="px-3">
                        {user.tenant_role ? (
                          <Badge variant="outline" className={getRoleBadgeClass(user.tenant_role)}>
                            {getRoleLabel(user.tenant_role)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={getRoleBadgeClass(null)}>
                            미등록
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        {user.applications.length === 0 ? (
                          <span className="text-zinc-400">-</span>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                            {user.applications.length}건
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        {user.entitlements.length === 0 ? (
                          <span className="text-zinc-400">-</span>
                        ) : (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-800">
                            {user.entitlements.length}개
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(user.created_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <MembershipActionPanel
        application={selectedApplication ?? undefined}
        programs={programs}
        canGrantMembership={canGrantMembership}
        onStatusChange={handleStatusChange}
        isStatusPending={isPending}
        open={Boolean(selectedApplication)}
        onOpenChange={(open) => {
          if (!open) setSelectedApplication(null);
        }}
      />

      <MembershipActionPanel
        user={selectedUser ?? undefined}
        defaultProgramId={
          selectedUser
            ? selectedUser.applications[0]?.program_id ?? selectedUser.current_program_id ?? selectedUser.entitlements[0]?.program_id
            : undefined
        }
        programs={programs}
        canGrantMembership={canGrantMembership}
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      />

      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageHref(Math.max(1, page - 1))}
              onClick={(event) => {
                if (page <= 1) event.preventDefault();
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
                if (page >= totalPages) event.preventDefault();
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
