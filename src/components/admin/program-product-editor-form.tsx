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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminProgramProductRow } from "@/lib/admin/types";

type ProgramProductEditorFormProps = {
  tenantSlug: string;
  product: AdminProgramProductRow;
};

export function ProgramProductEditorForm({ tenantSlug, product }: ProgramProductEditorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>(product.thumbnail_urls);
  const [contentHtml, setContentHtml] = useState(product.content_html || "<p></p>");
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [saleType, setSaleType] = useState<"one_time" | "subscription">(product.sale_type);
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
    formData.set("id", product.id);
    formData.set("thumbnailUrls", JSON.stringify(thumbnailUrls));
    formData.set("contentHtml", contentHtml);

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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/store/${tenantSlug}/${product.id}`);
    toast.success("상품 링크가 복사되었습니다.");
  };

  const handleThumbnailUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imageUrl = await uploadProgramProductImage(file, "store-thumbnail");
      setThumbnailUrls((previous) => [...previous, imageUrl]);
      toast.success("썸네일 이미지가 추가되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "썸네일 업로드에 실패했습니다.");
    } finally {
      event.target.value = "";
    }
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

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="md:col-span-2 space-y-1">
        <p className="text-sm font-medium text-zinc-900">{product.program_title}</p>
        <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceKrw">가격(원)</Label>
        <Input id="priceKrw" name="priceKrw" type="number" min={1000} step={1000} defaultValue={product.price_krw} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="isActive">판매 상태</Label>
        <select
          id="isActive"
          name="isActive"
          defaultValue={product.is_active ? "true" : "false"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="true">판매중</option>
          <option value="false">비공개</option>
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

      <div className="md:col-span-2 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium text-zinc-900">썸네일 이미지 (첫 번째가 대표)</Label>
          <Input type="file" accept="image/png,image/jpeg,image/webp" className="max-w-[260px]" onChange={handleThumbnailUpload} />
        </div>

        {primaryThumbnail ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">대표 썸네일</p>
            <div className="relative h-36 w-full overflow-hidden rounded-md border border-zinc-200 bg-white">
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
              <div className="relative h-24 w-full overflow-hidden rounded border border-zinc-200 bg-zinc-100">
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
        <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
          링크복사
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "상품 저장"}
        </Button>
      </div>
    </form>
  );
}
