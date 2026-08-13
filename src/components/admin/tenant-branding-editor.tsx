"use client";

import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { updateTenantBrandingAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TenantBrandingBannerUploader } from "@/components/admin/tenant-branding-banner-uploader";
import { TenantBrandingLogoUploader } from "@/components/admin/tenant-branding-logo-uploader";
import { TenantBrandingProgramCardImageUploader } from "@/components/admin/tenant-branding-program-card-image-uploader";
import type { TenantBrandingEditorData } from "@/lib/admin/types";

export function TenantBrandingEditor({ branding }: { branding: TenantBrandingEditorData }) {
  const tenantSlug = useTenantSlug();
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(branding.logo_url);
  const [bannerImageUrl, setBannerImageUrl] = useState(branding.banner_image_url);
  const [programCardImageUrl, setProgramCardImageUrl] = useState(branding.program_card_image_url);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");

    startTransition(async () => {
      const result = await updateTenantBrandingAction(formData);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="brandName">브랜드 네임</Label>
        <Input id="brandName" name="brandName" defaultValue={branding.brand_name} placeholder={branding.team_name || "XON"} />
      </div>

      <TenantBrandingLogoUploader
        tenantId={branding.tenant_id}
        teamName={branding.team_name}
        logoUrl={logoUrl}
        onUploaded={setLogoUrl}
      />
      <input type="hidden" name="logoUrl" value={logoUrl} />

      <TenantBrandingBannerUploader
        tenantId={branding.tenant_id}
        teamName={branding.team_name}
        bannerImageUrl={bannerImageUrl}
        onUploaded={setBannerImageUrl}
      />
      <input type="hidden" name="bannerImageUrl" value={bannerImageUrl} />

      <TenantBrandingProgramCardImageUploader
        tenantId={branding.tenant_id}
        teamName={branding.team_name}
        imageUrl={programCardImageUrl}
        onUploaded={setProgramCardImageUrl}
      />
      <input type="hidden" name="programCardImageUrl" value={programCardImageUrl} />

      <div className="space-y-2">
        <Label htmlFor="instagram">인스타그램</Label>
        <Input id="instagram" name="instagram" defaultValue={branding.instagram} placeholder="xon_training" />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">소개문구</Label>
        <Textarea id="description" name="description" defaultValue={branding.description} rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankName">입금 은행명</Label>
        <Input id="bankName" name="bankName" defaultValue={branding.bank_name} placeholder="국민은행" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccountNumber">입금 계좌번호</Label>
        <Input
          id="bankAccountNumber"
          name="bankAccountNumber"
          defaultValue={branding.bank_account_number}
          placeholder="123456-01-123456"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccountHolder">예금주</Label>
        <Input id="bankAccountHolder" name="bankAccountHolder" defaultValue={branding.bank_account_holder} placeholder="홍길동" />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="bankDepositGuide">입금 안내 문구</Label>
        <Textarea
          id="bankDepositGuide"
          name="bankDepositGuide"
          defaultValue={branding.bank_deposit_guide}
          rows={3}
          placeholder="주문 후 24시간 이내 입금해 주세요. 입금 확인 후 접근 권한이 활성화됩니다."
        />
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "브랜딩 저장"}
        </Button>
      </div>
    </form>
  );
}
