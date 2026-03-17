"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  createBookingServiceOptionAction,
  deleteBookingServiceAction,
  deleteBookingServiceOptionAction,
  deleteBookingSlotAction,
  generateBookingSlotsAction,
  updateBookingServiceAction,
  updateBookingServiceOptionAction,
  updateBookingSlotStatusAction,
} from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import type { AdminBookingServiceRow, BookingSlotStatus } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";

type BookingServiceEditFormProps = {
  service: AdminBookingServiceRow;
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "일" },
  { value: 6, label: "토" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
];

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSlotStatusMeta(status: BookingSlotStatus) {
  if (status === "open") return { label: "오픈", variant: "default" as const };
  if (status === "pending") return { label: "대기", variant: "secondary" as const };
  if (status === "booked") return { label: "예약확정", variant: "destructive" as const };
  if (status === "blocked") return { label: "막힘", variant: "outline" as const };
  return { label: "마감", variant: "outline" as const };
}

export function BookingServiceEditForm({ service }: BookingServiceEditFormProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const servicesPath = `${tenantBasePath}/admin/booking-services`;
  const [isPending, startTransition] = useTransition();
  const tenantSlug = useTenantSlug();

  const runAction = (action: () => Promise<{ ok: boolean; message: string }>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess?.();
      router.refresh();
    });
  };

  const handleServiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    runAction(() => updateBookingServiceAction(formData));
  };

  const handleOptionCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    runAction(() => createBookingServiceOptionAction(formData), () => event.currentTarget.reset());
  };

  const handleOptionUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    runAction(() => updateBookingServiceOptionAction(formData));
  };

  const handleSlotGeneration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    runAction(() => generateBookingSlotsAction(formData));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-zinc-900">{service.name}</h2>
            <Badge variant={service.is_active ? "default" : "secondary"}>{service.is_active ? "활성" : "비활성"}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">생성일 {formatDateTime(service.created_at)} / 수정일 {formatDateTime(service.updated_at)}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
            formData.set("serviceId", service.id);
            runAction(() => deleteBookingServiceAction(formData), () => push(servicesPath));
          }}
        >
          서비스 삭제
        </Button>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleServiceSubmit}>
        <input type="hidden" name="serviceId" value={service.id} />
        <div className="space-y-2">
          <Label htmlFor="name">서비스 이름</Label>
          <Input id="name" name="name" defaultValue={service.name} required />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">설명</Label>
          <Textarea id="description" name="description" rows={4} defaultValue={service.description} />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700 lg:col-span-2">
          <input type="checkbox" name="isActive" value="true" defaultChecked={service.is_active} className="size-4 accent-zinc-900" />
          현재 서비스 활성화
        </label>

        <div className="lg:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중..." : "서비스 저장"}
          </Button>
        </div>
      </form>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">예약 옵션</h3>
            <p className="text-sm text-zinc-500">옵션 이름과 가격을 자유롭게 관리합니다.</p>
          </div>

          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleOptionCreate}>
            <input type="hidden" name="serviceId" value={service.id} />
            <div className="space-y-2">
              <Label htmlFor="new-option-name">옵션 이름</Label>
              <Input id="new-option-name" name="name" placeholder="예: hyrox single men" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-option-price">가격</Label>
              <Input id="new-option-price" name="priceKrw" type="number" min={1} placeholder="30000" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new-option-description">설명</Label>
              <Input id="new-option-description" name="description" placeholder="관리용 설명" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-option-sort">정렬 순서</Label>
              <Input id="new-option-sort" name="sortOrder" type="number" defaultValue={service.options.length} />
            </div>
            <label className="flex items-center gap-2 self-end text-sm text-zinc-700">
              <input type="checkbox" name="isEnabled" value="true" defaultChecked className="size-4 accent-zinc-900" />
              바로 노출
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "추가 중..." : "옵션 추가"}
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {service.options.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500">등록된 옵션이 없습니다.</div>
            ) : (
              service.options.map((option) => (
                <form key={option.id} className="grid gap-3 rounded-lg border border-zinc-200 p-3 md:grid-cols-2" onSubmit={handleOptionUpdate}>
                  <input type="hidden" name="serviceId" value={service.id} />
                  <input type="hidden" name="optionId" value={option.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`option-name-${option.id}`}>옵션 이름</Label>
                    <Input id={`option-name-${option.id}`} name="name" defaultValue={option.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`option-price-${option.id}`}>가격</Label>
                    <Input id={`option-price-${option.id}`} name="priceKrw" type="number" min={1} defaultValue={option.price_krw} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`option-description-${option.id}`}>설명</Label>
                    <Input id={`option-description-${option.id}`} name="description" defaultValue={option.description} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`option-sort-${option.id}`}>정렬 순서</Label>
                    <Input id={`option-sort-${option.id}`} name="sortOrder" type="number" defaultValue={option.sort_order} />
                  </div>
                  <div className="flex items-center justify-between gap-3 self-end">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" name="isEnabled" value="true" defaultChecked={option.is_enabled} className="size-4 accent-zinc-900" />
                      사용
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={isPending}>저장</Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => {
                          const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
                          formData.set("optionId", option.id);
                          runAction(() => deleteBookingServiceOptionAction(formData));
                        }}
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                  <div className="md:col-span-2 text-sm text-zinc-500">현재 가격: {formatCurrency(option.price_krw)}</div>
                </form>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">슬롯 생성</h3>
            <p className="text-sm text-zinc-500">토/일 등 원하는 요일과 시간 범위로 슬롯을 한 번에 엽니다.</p>
          </div>

          <form className="space-y-3" onSubmit={handleSlotGeneration}>
            <input type="hidden" name="serviceId" value={service.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">시작일</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">종료일</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>요일 선택</Label>
              <div className="flex flex-wrap gap-3 rounded-lg border border-zinc-200 p-3">
                {WEEKDAY_OPTIONS.map((weekday) => (
                  <label key={weekday.value} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" name="weekdays" value={String(weekday.value)} defaultChecked={weekday.value === 0 || weekday.value === 6} className="size-4 accent-zinc-900" />
                    {weekday.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startHour">시작 시간</Label>
                <Input id="startHour" name="startHour" type="number" min={0} max={23} defaultValue={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endHour">종료 시간</Label>
                <Input id="endHour" name="endHour" type="number" min={1} max={24} defaultValue={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">단위</Label>
                <select id="durationMinutes" name="durationMinutes" defaultValue="60" className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-xs">
                  <option value="60">60분</option>
                  <option value="90">90분</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isPending}>{isPending ? "생성 중..." : "슬롯 일괄 생성"}</Button>
          </form>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <h4 className="font-medium text-zinc-900">최근 슬롯</h4>
            {service.upcoming_slots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-500">생성된 슬롯이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {service.upcoming_slots.map((slot) => {
                  const statusMeta = getSlotStatusMeta(slot.status);

                  return (
                    <div key={slot.id} className="rounded-lg border border-zinc-200 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-zinc-900">{formatDateTime(slot.starts_at)} - {formatDateTime(slot.ends_at)}</p>
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </div>
                          <p className="text-sm text-zinc-500">{slot.duration_minutes}분 / {slot.slot_date}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => {
                            const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
                            formData.set("slotId", slot.id);
                            formData.set("status", "open");
                            runAction(() => updateBookingSlotStatusAction(formData));
                          }}>열기</Button>
                          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => {
                            const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
                            formData.set("slotId", slot.id);
                            formData.set("status", "blocked");
                            runAction(() => updateBookingSlotStatusAction(formData));
                          }}>막기</Button>
                          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => {
                            const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
                            formData.set("slotId", slot.id);
                            formData.set("status", "closed");
                            runAction(() => updateBookingSlotStatusAction(formData));
                          }}>마감</Button>
                          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => {
                            const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
                            formData.set("slotId", slot.id);
                            runAction(() => deleteBookingSlotAction(formData));
                          }}>삭제</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
