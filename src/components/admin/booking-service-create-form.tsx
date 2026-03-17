"use client";

import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { createBookingServiceAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";

export function BookingServiceCreateForm() {
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const servicesPath = `${tenantBasePath}/admin/booking-services`;
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createBookingServiceAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      push(servicesPath);
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">서비스 이름</Label>
        <Input id="name" name="name" placeholder="예: Hyrox 예약" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" rows={4} placeholder="관리용 설명을 적어두세요." />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isActive" value="true" defaultChecked className="size-4 accent-zinc-900" />
        바로 사용 가능 상태로 생성
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "생성 중..." : "예약 서비스 생성"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => push(servicesPath)}>
          취소
        </Button>
      </div>
    </form>
  );
}
