"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createPartnerDiscountCodeAction,
  updatePartnerDiscountCodeAction,
} from "@/lib/admin/actions";
import type {
  AdminPartnerDiscountCodeRow,
  AdminPartnerDiscountProgramOption,
  PartnerDiscountMobileVisibility,
  PartnerDiscountVisibilityScope,
} from "@/lib/admin/types";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PartnerDiscountCodeEditorFormProps = {
  tenantSlug: string;
  code?: AdminPartnerDiscountCodeRow;
  programs: AdminPartnerDiscountProgramOption[];
};

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

async function uploadPartnerDiscountLogo(file: File, codeId?: string) {
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
    domainId: codeId,
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

export function PartnerDiscountCodeEditorForm({
  tenantSlug,
  code,
  programs,
}: PartnerDiscountCodeEditorFormProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibilityScope, setVisibilityScope] = useState<PartnerDiscountVisibilityScope>(code?.visibility_scope ?? "all_members");
  const [mobileVisibility, setMobileVisibility] = useState<PartnerDiscountMobileVisibility>(code?.mobile_visibility ?? "private");
  const [programId, setProgramId] = useState<string | undefined>(code?.program_id ?? undefined);
  const [brandLogoUrl, setBrandLogoUrl] = useState(code?.brand_logo_url ?? "");
  const [isSavePending, startSaveTransition] = useTransition();
  const [isUploadPending, startUploadTransition] = useTransition();

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    startUploadTransition(async () => {
      try {
        const nextUrl = await uploadPartnerDiscountLogo(file, code?.id);
        setBrandLogoUrl(nextUrl);
        toast.success("브랜드 로고가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "브랜드 로고 업로드에 실패했습니다.");
      }
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("visibilityScope", visibilityScope);
    formData.set("mobileVisibility", mobileVisibility);
    formData.set("programId", visibilityScope === "program_members" ? programId ?? "" : "");
    formData.set("brandLogoUrl", brandLogoUrl);
    if (code) {
      formData.set("codeId", code.id);
    } else {
      formData.set("isActive", "true");
    }

    startSaveTransition(async () => {
      const result = code
        ? await updatePartnerDiscountCodeAction(formData)
        : await createPartnerDiscountCodeAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      if (code) {
        router.refresh();
      } else {
        push(`/t/${tenantSlug}/admin/partner-discounts`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="partner-brand-name">브랜드명</Label>
          <Input id="partner-brand-name" name="brandName" defaultValue={code?.brand_name ?? ""} placeholder="예: Nike" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-title">혜택명</Label>
          <Input id="partner-title" name="title" defaultValue={code?.title ?? ""} placeholder="예: 러닝화 15% 할인" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-code-text">코드 텍스트</Label>
          <Input id="partner-code-text" name="codeText" defaultValue={code?.code_text ?? ""} placeholder="AMOR15" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-use-url">사용 링크</Label>
          <Input id="partner-use-url" name="useUrl" type="url" defaultValue={code?.use_url ?? ""} placeholder="https://example.com" required />
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
          <Input id="partner-display-order" name="displayOrder" type="number" step={1} defaultValue={code?.display_order ?? 0} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <Input id="partner-starts-at" name="startsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(code?.starts_at ?? null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-ends-at">종료일</Label>
          <Input id="partner-ends-at" name="endsAt" type="datetime-local" defaultValue={toDateTimeLocalValue(code?.ends_at ?? null)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="partner-description">설명</Label>
          <Textarea id="partner-description" name="description" rows={4} defaultValue={code?.description ?? ""} placeholder="회원에게 보여줄 혜택 설명" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-terms">이용 조건</Label>
          <Textarea id="partner-terms" name="termsText" rows={4} defaultValue={code?.terms_text ?? ""} placeholder="예: 중복 할인 불가, 일부 상품 제외" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => push(`/t/${tenantSlug}/admin/partner-discounts`)}>
          취소
        </Button>
        <Button type="submit" disabled={isSavePending || isUploadPending}>
          {isSavePending ? <Loader2 className="size-4 animate-spin" /> : null}
          {code ? "수정 저장" : "제휴 코드 생성"}
        </Button>
      </div>
    </form>
  );
}
