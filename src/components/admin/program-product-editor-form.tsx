"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { updateProgramProductAction } from "@/lib/admin/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { DURATION_PASS_MONTHS, formatDurationPassLabel, type DurationPassMonths } from "@/lib/store/duration-options";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminProgramProductRow } from "@/lib/admin/types";

type ProgramProductEditorFormProps = {
  tenantSlug: string;
  product: AdminProgramProductRow;
};

export function ProgramProductEditorForm({ tenantSlug, product }: ProgramProductEditorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isThumbnailUploadPending, startThumbnailUploadTransition] = useTransition();
  const [isIntroImageUploadPending, startIntroImageUploadTransition] = useTransition();
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>(product.thumbnail_urls);
  const [introImageUrl, setIntroImageUrl] = useState(product.intro_image_url || "");
  const [contentHtml, setContentHtml] = useState(product.content_html || "<p></p>");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [introCropSourceFile, setIntroCropSourceFile] = useState<File | null>(null);
  const [isIntroCropDialogOpen, setIsIntroCropDialogOpen] = useState(false);
  const [saleType, setSaleType] = useState<"one_time" | "subscription">(product.sale_type);
  const [durationOptions, setDurationOptions] = useState(() =>
    DURATION_PASS_MONTHS.map((durationMonths) => {
      const existing = product.duration_options.find((option) => option.duration_months === durationMonths);
      return {
        duration_months: durationMonths,
        price_krw: existing?.price_krw ?? product.price_krw,
        is_enabled: existing?.is_enabled ?? durationMonths === 1,
      };
    })
  );
  const router = useRouter();

  const primaryThumbnail = useMemo(() => thumbnailUrls[0] ?? "", [thumbnailUrls]);

  const uploadProgramProductImage = async (file: File, domainFolder: "store-thumbnail" | "store-content") => {
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
      domainFolder,
      maxDimension: 1600,
      quality: 0.9,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "program_logo",
      domainId: product.id,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
    });

    if (!mediaResult.ok) {
      throw new Error(mediaResult.message);
    }

    return uploaded.publicUrl;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", product.id);
    formData.set("thumbnailUrls", JSON.stringify(thumbnailUrls));
    formData.set("introImageUrl", introImageUrl);
    formData.set("contentHtml", contentHtml);
    formData.set("durationOptions", JSON.stringify(durationOptions));

    startTransition(async () => {
      const result = await updateProgramProductAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleThumbnailCropConfirm = (croppedFile: File) => {
    startThumbnailUploadTransition(async () => {
      try {
        const imageUrl = await uploadProgramProductImage(croppedFile, "store-thumbnail");
        setThumbnailUrls((previous) => [...previous, imageUrl]);
        setCropSourceFile(null);
        setIsCropDialogOpen(false);
        toast.success("썸네일 이미지가 추가되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "썸네일 업로드에 실패했습니다.");
      }
    });
  };

  const handleIntroImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setIntroCropSourceFile(file);
    setIsIntroCropDialogOpen(true);
  };

  const handleIntroImageCropConfirm = (croppedFile: File) => {
    startIntroImageUploadTransition(async () => {
      try {
        const imageUrl = await uploadProgramProductImage(croppedFile, "store-content");
        setIntroImageUrl(imageUrl);
        setIntroCropSourceFile(null);
        setIsIntroCropDialogOpen(false);
        toast.success("소개 이미지가 저장되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "소개 이미지 업로드에 실패했습니다.");
      }
    });
  };

  const moveThumbnail = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= thumbnailUrls.length) {
      return;
    }

    setThumbnailUrls((previous) => {
      const cloned = [...previous];
      const [selected] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, selected);
      return cloned;
    });
  };

  const removeThumbnail = (index: number) => {
    setThumbnailUrls((previous) => previous.filter((_, idx) => idx !== index));
  };

  const handleDropThumbnail = (targetIndex: number) => {
    if (draggingIndex === null || draggingIndex === targetIndex) {
      setDraggingIndex(null);
      return;
    }

    setThumbnailUrls((previous) => {
      const cloned = [...previous];
      const [selected] = cloned.splice(draggingIndex, 1);
      cloned.splice(targetIndex, 0, selected);
      return cloned;
    });

    setDraggingIndex(null);
  };

  const uploadEditorImage = async (file: File) => uploadProgramProductImage(file, "store-content");

  const updateDurationOption = (durationMonths: DurationPassMonths, patch: Partial<(typeof durationOptions)[number]>) => {
    setDurationOptions((previous) =>
      previous.map((option) =>
        option.duration_months === durationMonths
          ? {
              ...option,
              ...patch,
            }
          : option
      )
    );
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="md:col-span-2 space-y-1">
        <p className="text-sm font-medium text-zinc-900">{product.program_title}</p>
        <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
      </div>

      {saleType === "subscription" ? (
        <div className="space-y-2">
          <Label htmlFor="priceKrw">가격(원)</Label>
          <Input id="priceKrw" name="priceKrw" type="number" min={1000} step={1000} defaultValue={product.price_krw} required />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="saleStatus">판매 상태</Label>
        <select
          id="saleStatus"
          name="saleStatus"
          defaultValue={product.sale_status}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="active">판매중</option>
          <option value="preparing">준비중</option>
          <option value="private">비공개</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="saleType">판매 유형</Label>
        <select
          id="saleType"
          name="saleType"
          value={saleType}
          onChange={(event) => setSaleType(event.target.value === "subscription" ? "subscription" : "one_time")}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="one_time">1회 결제</option>
          <option value="subscription">월 구독</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingInterval">구독 주기</Label>
        <select
          id="billingInterval"
          name="billingInterval"
          defaultValue={product.billing_interval ?? "monthly"}
          disabled={saleType !== "subscription"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
        >
          <option value="monthly">매월</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingAnchorDay">정기 결제일(선택)</Label>
        <Input
          id="billingAnchorDay"
          name="billingAnchorDay"
          type="number"
          min={1}
          max={28}
          step={1}
          defaultValue={product.billing_anchor_day ?? ""}
          disabled={saleType !== "subscription"}
          placeholder="미입력 시 결제일 기준"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="subscriptionGraceDays">결제 실패 유예 기간(일)</Label>
        <Input
          id="subscriptionGraceDays"
          name="subscriptionGraceDays"
          type="number"
          min={0}
          max={30}
          step={1}
          defaultValue={product.subscription_grace_days}
          disabled={saleType !== "subscription"}
        />
      </div>

      {saleType === "one_time" ? (
        <div className="space-y-3 md:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-900">기간권 옵션</p>
            <p className="text-xs text-zinc-500">실제 판매할 기간권만 활성화하세요. 스토어 상세에서는 활성 옵션만 노출됩니다.</p>
          </div>

          <div className="grid gap-3">
            {durationOptions.map((option) => (
              <div key={option.duration_months} className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <input
                    type="checkbox"
                    checked={option.is_enabled}
                    onChange={(event) => updateDurationOption(option.duration_months, { is_enabled: event.target.checked })}
                  />
                  <span>{formatDurationPassLabel(option.duration_months)}</span>
                </label>

                <div className="space-y-2">
                  <Label htmlFor={`duration-price-${option.duration_months}`}>가격(원)</Label>
                  <Input
                    id={`duration-price-${option.duration_months}`}
                    type="number"
                    min={1000}
                    step={1000}
                    value={option.price_krw}
                    onChange={(event) =>
                      updateDurationOption(option.duration_months, {
                        price_krw: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium text-zinc-900">썸네일 이미지 (첫 번째가 대표)</Label>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-[260px]"
            disabled={isPending || isThumbnailUploadPending}
            onChange={handleThumbnailUpload}
          />
        </div>

        {primaryThumbnail ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">대표 썸네일</p>
            <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-md border border-zinc-200 bg-white">
              <Image src={primaryThumbnail} alt="대표 썸네일" fill className="object-cover" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">등록된 썸네일이 없습니다.</p>
        )}

        <div className="grid gap-2 md:grid-cols-2">
          {thumbnailUrls.map((url, index) => (
            <div
              key={`${url}-${index}`}
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragEnd={() => setDraggingIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropThumbnail(index)}
              className="rounded-md border border-zinc-200 bg-white p-2"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                <Image src={url} alt={`썸네일 ${index + 1}`} fill className="object-cover" />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">드래그해서 순서를 변경할 수 있습니다.</p>
              <div className="mt-2 flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => moveThumbnail(index, -1)} disabled={index === 0}>
                  위로
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => moveThumbnail(index, 1)}
                  disabled={index === thumbnailUrls.length - 1}
                >
                  아래로
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeThumbnail(index)}>
                  삭제
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium text-zinc-900">소개 이미지 (16:9)</Label>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-[260px]"
            disabled={isPending || isIntroImageUploadPending}
            onChange={handleIntroImageUpload}
          />
        </div>

        {introImageUrl ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">프로그램 소개 섹션에 노출됩니다.</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-zinc-200 bg-white">
              <Image src={introImageUrl} alt="소개 이미지" fill className="object-cover" />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="destructive" onClick={() => setIntroImageUrl("")} disabled={isIntroImageUploadPending}>
                제거
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">등록된 소개 이미지가 없습니다.</p>
        )}
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label>상품 본문</Label>
        <TiptapEditor
          value={contentHtml}
          onChange={setContentHtml}
          placeholder="스토어 상품 본문을 입력하세요."
          onUploadImage={uploadEditorImage}
        />
      </div>

      <div className="md:col-span-2 flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "상품 저장"}
        </Button>
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isThumbnailUploadPending}
        onOpenChange={(open) => {
          setIsCropDialogOpen(open);
          if (!open) {
            setCropSourceFile(null);
          }
        }}
        onConfirm={handleThumbnailCropConfirm}
      />

      <SquareImageCropDialog
        open={isIntroCropDialogOpen}
        file={introCropSourceFile}
        isSubmitting={isIntroImageUploadPending}
        onOpenChange={(open) => {
          setIsIntroCropDialogOpen(open);
          if (!open) {
            setIntroCropSourceFile(null);
          }
        }}
        onConfirm={handleIntroImageCropConfirm}
        aspectRatio={16 / 9}
        outputWidth={1600}
        outputHeight={900}
        title="소개 이미지 16:9 크롭"
        description="드래그와 확대/축소로 프로그램 소개 이미지를 16:9 비율에 맞춰 주세요."
        outputLabel="출력은 16:9 비율(1600x900 webp)로 저장됩니다."
      />
    </form>
  );
}
