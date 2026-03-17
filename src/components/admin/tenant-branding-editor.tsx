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
import { TenantBrandingLogoUploader } from "@/components/admin/tenant-branding-logo-uploader";
import { TenantBrandingCoachImageUploader } from "@/components/admin/tenant-branding-coach-image-uploader";
import type { TenantBrandingEditorData } from "@/lib/admin/types";

function toLineText(values: string[]) {
  return values.join("\n");
}

export function TenantBrandingEditor({ branding }: { branding: TenantBrandingEditorData }) {
  const tenantSlug = useTenantSlug();
  const [isPending, startTransition] = useTransition();
  const [logoUrl, setLogoUrl] = useState(branding.logo_url);
  const [coachImageUrl, setCoachImageUrl] = useState(branding.coach_image_url);

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
      <TenantBrandingLogoUploader
        tenantId={branding.tenant_id}
        teamName={branding.team_name}
        logoUrl={logoUrl}
        onUploaded={setLogoUrl}
      />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="coachImageUrl" value={coachImageUrl} />

      <TenantBrandingCoachImageUploader
        tenantId={branding.tenant_id}
        coachName={branding.coach_name}
        imageUrl={coachImageUrl}
        onUploaded={setCoachImageUrl}
      />

      <div className="space-y-2">
        <Label htmlFor="teamName">팀 이름</Label>
        <Input id="teamName" name="teamName" defaultValue={branding.team_name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slogan">슬로건</Label>
        <Input id="slogan" name="slogan" defaultValue={branding.slogan} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coachName">코치 이름</Label>
        <Input id="coachName" name="coachName" defaultValue={branding.coach_name} />
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

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">팀 설명</Label>
        <Textarea id="description" name="description" defaultValue={branding.description} rows={4} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coachInstagram">코치 인스타그램</Label>
        <Input id="coachInstagram" name="coachInstagram" defaultValue={branding.coach_instagram} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="coachCareer">코치 경력 (줄바꿈 구분)</Label>
        <Textarea id="coachCareer" name="coachCareer" defaultValue={toLineText(branding.coach_career)} rows={5} />
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
