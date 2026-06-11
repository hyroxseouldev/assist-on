"use client";

import Image from "next/image";
import { Camera, Loader2, Pencil, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import {
  createPartnerDiscountCodeAction,
  togglePartnerDiscountCodeActiveAction,
  togglePartnerDiscountCodeMobileVisibilityAction,
  updatePartnerDiscountCodeAction,
} from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type {
  AdminPartnerDiscountCodeRow,
  AdminPartnerDiscountProgramOption,
  PartnerDiscountMobileVisibility,
  PartnerDiscountVisibilityScope,
} from "@/lib/admin/types";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PartnerDiscountCodesManagerProps = {
  codes: AdminPartnerDiscountCodeRow[];
  programs: AdminPartnerDiscountProgramOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const visibilityScopeLabels: Record<PartnerDiscountVisibilityScope, string> = {
  all_members: "전체 회원",
  program_members: "프로그램 회원",
};

const mobileVisibilityLabels: Record<PartnerDiscountMobileVisibility, string> = {
  public: "모바일 공개",
  private: "비공개",
};

function getCodeStatus(code: AdminPartnerDiscountCodeRow) {
  const now = Date.now();
  const startsAt = code.starts_at ? Date.parse(code.starts_at) : null;
  const endsAt = code.ends_at ? Date.parse(code.ends_at) : null;

  if (!code.is_active) {
    return { label: "비활성", variant: "outline" as const };
  }

  if (startsAt !== null && startsAt > now) {
    return { label: "대기", variant: "secondary" as const };
  }

  if (endsAt !== null && endsAt <= now) {
    return { label: "만료", variant: "outline" as const };
  }

  return { label: "활성", variant: "default" as const };
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

async function uploadPartnerDiscountLogo(file: File) {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("이미지 업로드를 위해 로그인이 필요합니다.");
  }

  const uploaded = await uploadImageToStorage(file, {
    bucket: "content-media",
    userId: user.id,
    domainFolder: "partner-discount-logo",
    maxDimension: 1024,
    quality: 0.9,
  });

  const mediaResult = await registerMediaAssetAction({
    bucket: uploaded.bucket,
    path: uploaded.path,
    publicUrl: uploaded.publicUrl,
    domainType: "partner_discount_brand_logo",
    mimeType: uploaded.mimeType,
    sizeBytes: uploaded.sizeBytes,
    width: uploaded.width,
    height: uploaded.height,
  });

  if (!mediaResult.ok) {
    throw new Error(mediaResult.message);
  }

  return uploaded.publicUrl;
}

export function PartnerDiscountCodesManager({
  codes,
  programs,
  total,
  page,
  pageSize,
  totalPages,
}: PartnerDiscountCodesManagerProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibilityScope, setVisibilityScope] = useState<PartnerDiscountVisibilityScope>("all_members");
  const [mobileVisibility, setMobileVisibility] = useState<PartnerDiscountMobileVisibility>("private");
  const [programId, setProgramId] = useState<string | undefined>();
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [updatingCodeId, setUpdatingCodeId] = useState<string | null>(null);
  const isEditing = editingCodeId !== null;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 제휴 할인 코드가 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    const nextQuery = params.toString();
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    startUploadTransition(async () => {
      try {
        const nextUrl = await uploadPartnerDiscountLogo(file);
        setBrandLogoUrl(nextUrl);
        toast.success("브랜드 로고가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "브랜드 로고 업로드에 실패했습니다.");
      }
    });
  };

  const resetEditor = () => {
    formRef.current?.reset();
    setEditingCodeId(null);
    setVisibilityScope("all_members");
    setMobileVisibility("private");
    setProgramId(undefined);
    setBrandLogoUrl("");
  };

  const setFormFieldValue = (name: string, value: string) => {
    const field = formRef.current?.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.value = value;
    }
  };

  const handleEdit = (code: AdminPartnerDiscountCodeRow) => {
    setEditingCodeId(code.id);
    setVisibilityScope(code.visibility_scope);
    setMobileVisibility(code.mobile_visibility);
    setProgramId(code.program_id ?? undefined);
    setBrandLogoUrl(code.brand_logo_url);
    setFormFieldValue("brandName", code.brand_name);
    setFormFieldValue("title", code.title);
    setFormFieldValue("codeText", code.code_text);
    setFormFieldValue("useUrl", code.use_url);
    setFormFieldValue("displayOrder", String(code.display_order));
    setFormFieldValue("startsAt", toDateTimeLocalValue(code.starts_at));
    setFormFieldValue("endsAt", toDateTimeLocalValue(code.ends_at));
    setFormFieldValue("description", code.description);
    setFormFieldValue("termsText", code.terms_text);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = (formData: FormData) => {
    formData.set("tenantSlug", tenantSlug ?? "");
    if (editingCodeId) {
      formData.set("codeId", editingCodeId);
    }
    formData.set("visibilityScope", visibilityScope);
    formData.set("mobileVisibility", mobileVisibility);
    formData.set("programId", visibilityScope === "program_members" ? programId ?? "" : "");
    formData.set("brandLogoUrl", brandLogoUrl);

    startCreateTransition(async () => {
      const result = editingCodeId
        ? await updatePartnerDiscountCodeAction(formData)
        : await createPartnerDiscountCodeAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      resetEditor();
      router.refresh();
    });
  };

  const handleToggleActive = (code: AdminPartnerDiscountCodeRow) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("codeId", code.id);
    formData.set("isActive", String(!code.is_active));
    setUpdatingCodeId(code.id);

    startToggleTransition(async () => {
      const result = await togglePartnerDiscountCodeActiveAction(formData);
      setUpdatingCodeId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const handleToggleMobileVisibility = (code: AdminPartnerDiscountCodeRow) => {
    const nextVisibility: PartnerDiscountMobileVisibility = code.mobile_visibility === "public" ? "private" : "public";
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("codeId", code.id);
    formData.set("mobileVisibility", nextVisibility);
    setUpdatingCodeId(code.id);

    startToggleTransition(async () => {
      const result = await togglePartnerDiscountCodeMobileVisibilityAction(formData);
      setUpdatingCodeId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          handleSave(new FormData(event.currentTarget));
        }}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        {isEditing ? (
          <div className="flex flex-col gap-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
            <span>선택한 제휴 할인 코드를 수정 중입니다.</span>
            <Button type="button" size="sm" variant="ghost" onClick={resetEditor}>
              <X className="size-4" />
              수정 취소
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="partner-brand-name">브랜드명</Label>
            <Input id="partner-brand-name" name="brandName" placeholder="예: Nike" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-title">혜택명</Label>
            <Input id="partner-title" name="title" placeholder="예: 러닝화 15% 할인" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-code-text">코드 텍스트</Label>
            <Input id="partner-code-text" name="codeText" placeholder="AMOR15" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-use-url">사용 링크</Label>
            <Input id="partner-use-url" name="useUrl" type="url" placeholder="https://example.com" required />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_160px]">
          <div className="space-y-2">
            <Label>브랜드 로고</Label>
            <div className="flex items-center gap-3">
              <div className="relative size-14 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                {brandLogoUrl ? <Image src={brandLogoUrl} alt="브랜드 로고" fill className="object-cover" /> : null}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
              <Button type="button" variant="outline" disabled={isUploadPending} onClick={() => fileRef.current?.click()}>
                {isUploadPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                {isUploadPending ? "업로드 중..." : "로고 업로드"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-visibility-scope">노출 대상</Label>
            <Select
              value={visibilityScope}
              onValueChange={(value) => {
                const nextScope = value as PartnerDiscountVisibilityScope;
                setVisibilityScope(nextScope);
                if (nextScope === "all_members") {
                  setProgramId(undefined);
                }
              }}
            >
              <SelectTrigger id="partner-visibility-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_members">전체 회원</SelectItem>
                <SelectItem value="program_members">프로그램 회원</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-program-id">프로그램</Label>
            <Select value={programId} onValueChange={setProgramId} disabled={visibilityScope === "all_members"}>
              <SelectTrigger id="partner-program-id">
                <SelectValue placeholder="프로그램 선택" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-display-order">정렬</Label>
            <Input id="partner-display-order" name="displayOrder" type="number" step={1} defaultValue={0} required />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="partner-mobile-visibility">모바일 공개</Label>
            <Select value={mobileVisibility} onValueChange={(value) => setMobileVisibility(value as PartnerDiscountMobileVisibility)}>
              <SelectTrigger id="partner-mobile-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">비공개</SelectItem>
                <SelectItem value="public">공개</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-starts-at">시작일</Label>
            <Input id="partner-starts-at" name="startsAt" type="datetime-local" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-ends-at">종료일</Label>
            <Input id="partner-ends-at" name="endsAt" type="datetime-local" />
          </div>
          <div className="flex items-end">
            <input type="hidden" name="isActive" value="true" />
            <Button type="submit" className="w-full" disabled={isCreatePending || isUploadPending}>
              {isCreatePending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEditing ? "수정 저장" : "제휴 코드 생성"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partner-description">설명</Label>
            <Textarea id="partner-description" name="description" rows={3} placeholder="회원에게 보여줄 혜택 설명" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-terms">이용 조건</Label>
            <Textarea id="partner-terms" name="termsText" rows={3} placeholder="예: 중복 할인 불가, 일부 상품 제외" />
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">{summaryText}</p>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-[110px] self-end sm:self-auto">
            <SelectValue aria-label={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩</SelectItem>
            <SelectItem value="20">20개씩</SelectItem>
            <SelectItem value="50">50개씩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">브랜드</TableHead>
              <TableHead className="px-3">혜택</TableHead>
              <TableHead className="px-3">코드</TableHead>
              <TableHead className="px-3">노출</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">기간</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  등록된 제휴 할인 코드가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => {
                const status = getCodeStatus(code);
                const isUpdating = isTogglePending && updatingCodeId === code.id;

                return (
                  <TableRow key={code.id}>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                          {code.brand_logo_url ? <Image src={code.brand_logo_url} alt={`${code.brand_name} 로고`} fill className="object-cover" /> : null}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{code.brand_name}</p>
                          <p className="text-xs text-zinc-500">정렬 {code.display_order}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px] px-3">
                      <p className="font-medium text-zinc-900">{code.title}</p>
                      <p className="line-clamp-1 text-xs text-zinc-500">{code.description || code.use_url}</p>
                    </TableCell>
                    <TableCell className="px-3 font-mono font-semibold text-zinc-950">{code.code_text}</TableCell>
                    <TableCell className="px-3">
                      <div className="space-y-1">
                        <Badge variant={code.mobile_visibility === "public" ? "default" : "outline"}>
                          {mobileVisibilityLabels[code.mobile_visibility]}
                        </Badge>
                        <p className="text-xs text-zinc-500">
                          {visibilityScopeLabels[code.visibility_scope]}
                          {code.program_title ? ` · ${code.program_title}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {code.starts_at || code.ends_at ? (
                        <span>
                          {formatAdminDateTime(code.starts_at)} ~ {formatAdminDateTime(code.ends_at)}
                        </span>
                      ) : (
                        "상시"
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={isCreatePending} onClick={() => handleEdit(code)}>
                          <Pencil className="size-4" />
                          수정
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isTogglePending} onClick={() => handleToggleActive(code)}>
                          {isUpdating ? <Loader2 className="size-4 animate-spin" /> : null}
                          {code.is_active ? "비활성화" : "활성화"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isTogglePending} onClick={() => handleToggleMobileVisibility(code)}>
                          {code.mobile_visibility === "public" ? "비공개" : "공개"}
                        </Button>
                      </div>
                    </TableCell>
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
