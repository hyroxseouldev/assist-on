"use client";

import Image from "next/image";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { uploadLocationImage } from "@/components/admin/location-image-upload";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import {
  createLocationAction,
  deleteLocationAction,
  updateLocationAction,
  type ActionResult,
} from "@/lib/admin/actions";
import type { AdminLocationRow } from "@/lib/admin/types";
import {
  DEFAULT_LOCATION_AMENITY_ICON_KEY,
  LOCATION_AMENITY_ICON_OPTIONS,
  getLocationAmenityIcon,
  type LocationAmenity,
} from "@/lib/locations/icons";
import { useAdminNavigation } from "./admin-navigation-feedback";

type LocationFormProps = {
  location?: AdminLocationRow;
};

type LocationImageUploadTarget = "thumbnail" | "gallery" | "map";

type CropConfig = {
  title: string;
  description: string;
  outputLabel: string;
  aspectRatio: number;
  outputWidth: number;
  outputHeight: number;
};

const CROP_CONFIGS: Record<LocationImageUploadTarget, CropConfig> = {
  thumbnail: {
    title: "썸네일 1:1 크롭",
    description: "목록과 모바일 카드에 표시될 정사각 썸네일 영역을 맞춰 주세요.",
    outputLabel: "출력은 1:1 비율(1024x1024 webp)로 저장됩니다.",
    aspectRatio: 1,
    outputWidth: 1024,
    outputHeight: 1024,
  },
  gallery: {
    title: "지점 이미지 2:1 크롭",
    description: "상세 갤러리에 표시될 가로형 지점 이미지 영역을 맞춰 주세요.",
    outputLabel: "출력은 2:1 비율(1600x800 webp)로 저장됩니다.",
    aspectRatio: 2,
    outputWidth: 1600,
    outputHeight: 800,
  },
  map: {
    title: "지도 이미지 16:9 크롭",
    description: "지도와 약도 이미지가 잘 보이도록 16:9 영역을 맞춰 주세요.",
    outputLabel: "출력은 16:9 비율(1600x900 webp)로 저장됩니다.",
    aspectRatio: 16 / 9,
    outputWidth: 1600,
    outputHeight: 900,
  },
};

function createEmptyAmenity(): LocationAmenity {
  return {
    label: "",
    description: "",
    iconKey: DEFAULT_LOCATION_AMENITY_ICON_KEY,
  };
}

export function LocationForm({ location }: LocationFormProps) {
  const { push } = useAdminNavigation();
  const tenantBasePath = useTenantBasePath();
  const tenantSlug = useTenantSlug();
  const locationsPath = `${tenantBasePath}/admin/locations`;
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [thumbnailUrl, setThumbnailUrl] = useState(location?.thumbnail_url ?? "");
  const [imageUrls, setImageUrls] = useState(location?.image_urls ?? []);
  const [mapImageUrl, setMapImageUrl] = useState(location?.map_image_url ?? "");
  const [amenities, setAmenities] = useState<LocationAmenity[]>(location?.amenities ?? []);
  const [uploadTarget, setUploadTarget] = useState<LocationImageUploadTarget>("gallery");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(location);
  const cropConfig = CROP_CONFIGS[uploadTarget];

  const runAction = (action: () => Promise<ActionResult>, onSuccess?: () => void) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onSuccess?.();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("thumbnailUrl", thumbnailUrl);
    formData.set("imageUrls", JSON.stringify(imageUrls));
    formData.set("mapImageUrl", mapImageUrl);
    formData.set(
      "amenities",
      JSON.stringify(
        amenities
          .map((amenity) => ({
            label: amenity.label.trim(),
            description: amenity.description.trim(),
            iconKey: amenity.iconKey,
          }))
          .filter((amenity) => amenity.label.length > 0)
      )
    );

    if (location) {
      formData.set("locationId", location.id);
      runAction(() => updateLocationAction(formData));
      return;
    }

    runAction(() => createLocationAction(formData), () => push(locationsPath));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    if (uploadTarget === "gallery" && imageUrls.length >= 5) {
      toast.error("지점 이미지는 최대 5장까지 등록할 수 있습니다.");
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startUploadTransition(async () => {
      try {
        const uploadedUrl = await uploadLocationImage(croppedFile, location?.id);
        if (uploadTarget === "thumbnail") {
          setThumbnailUrl(uploadedUrl);
        } else if (uploadTarget === "map") {
          setMapImageUrl(uploadedUrl);
        } else {
          setImageUrls((current) => [...current, uploadedUrl].slice(0, 5));
        }
        setIsCropDialogOpen(false);
        setCropSourceFile(null);
        toast.success("이미지가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
      }
    });
  };

  const openFilePicker = (target: LocationImageUploadTarget) => {
    setUploadTarget(target);
    fileRef.current?.click();
  };

  const updateAmenity = (index: number, patch: Partial<LocationAmenity>) => {
    setAmenities((current) => current.map((amenity, currentIndex) => (currentIndex === index ? { ...amenity, ...patch } : amenity)));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">지점명</Label>
          <Input id="name" name="name" defaultValue={location?.name ?? ""} placeholder="예: 클리어 트레이닝 잠실점" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">정렬 순서</Label>
          <Input id="sortOrder" name="sortOrder" type="number" defaultValue={location?.sort_order ?? 0} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">주소</Label>
          <Input id="address" name="address" defaultValue={location?.address ?? ""} placeholder="예: 서울 송파구 ..." required />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">지점 정보</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={location?.description ?? ""}
            placeholder="공간, 운영 방식, 이용 안내 등을 입력하세요."
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">썸네일 이미지</h3>
            <p className="text-sm text-zinc-500">목록과 모바일 카드에 우선 표시되는 대표 이미지입니다.</p>
          </div>
          <Button type="button" variant="outline" disabled={isUploading} onClick={() => openFilePicker("thumbnail")}>
            {isUploading && uploadTarget === "thumbnail" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            썸네일 업로드
          </Button>
        </div>

        {thumbnailUrl ? (
          <div className="max-w-xs space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
              <Image src={thumbnailUrl} alt="지점 썸네일 이미지" fill className="object-cover" sizes="240px" />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setThumbnailUrl("")}>
              <Trash2 className="size-4" />
              썸네일 삭제
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
            등록된 썸네일 이미지가 없습니다.
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">지점 이미지</h3>
            <p className="text-sm text-zinc-500">최대 5장까지 등록할 수 있습니다.</p>
          </div>
          <Button type="button" variant="outline" disabled={isUploading || imageUrls.length >= 5} onClick={() => openFilePicker("gallery")}>
            {isUploading && uploadTarget === "gallery" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            이미지 업로드
          </Button>
        </div>

        {imageUrls.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">등록된 이미지가 없습니다.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {imageUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="space-y-2">
                <div className="relative aspect-[2/1] overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                  <Image src={url} alt={`지점 이미지 ${index + 1}`} fill className="object-cover" sizes="160px" />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                >
                  <Trash2 className="size-4" />
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">지도 이미지</h3>
            <p className="text-sm text-zinc-500">약도나 지도 캡처 이미지를 등록합니다.</p>
          </div>
          <Button type="button" variant="outline" disabled={isUploading} onClick={() => openFilePicker("map")}>
            {isUploading && uploadTarget === "map" ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            지도 이미지 업로드
          </Button>
        </div>

        {mapImageUrl ? (
          <div className="max-w-xl space-y-2">
            <div className="relative aspect-[16/9] overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
              <Image src={mapImageUrl} alt="지도 이미지" fill className="object-cover" sizes="480px" />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setMapImageUrl("")}>
              <Trash2 className="size-4" />
              지도 이미지 삭제
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">등록된 지도 이미지가 없습니다.</div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">편의시설</h3>
            <p className="text-sm text-zinc-500">아이콘, 이름, 설명을 자유롭게 관리합니다.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setAmenities((current) => [...current, createEmptyAmenity()])}>
            <Plus className="size-4" />
            편의시설 추가
          </Button>
        </div>

        {amenities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">등록된 편의시설이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {amenities.map((amenity, index) => {
              const Icon = getLocationAmenityIcon(amenity.iconKey);
              return (
                <div key={index} className="grid gap-3 rounded-lg border border-zinc-200 p-3 md:grid-cols-[150px_1fr_1.4fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor={`amenity-icon-${index}`}>아이콘</Label>
                    <select
                      id={`amenity-icon-${index}`}
                      value={amenity.iconKey}
                      onChange={(event) => updateAmenity(index, { iconKey: event.target.value as LocationAmenity["iconKey"] })}
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                    >
                      {LOCATION_AMENITY_ICON_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`amenity-label-${index}`}>이름</Label>
                    <Input
                      id={`amenity-label-${index}`}
                      value={amenity.label}
                      onChange={(event) => updateAmenity(index, { label: event.target.value })}
                      placeholder="예: 샤워시설"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`amenity-description-${index}`}>설명</Label>
                    <Input
                      id={`amenity-description-${index}`}
                      value={amenity.description}
                      onChange={(event) => updateAmenity(index, { description: event.target.value })}
                      placeholder="예: 남녀 분리 샤워실 운영"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                      <Icon className="size-4" />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label="편의시설 삭제"
                      onClick={() => setAmenities((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isNew" value="true" defaultChecked={location?.is_new ?? false} className="size-4 accent-zinc-900" />
        신규 지점 배지 표시
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={location?.is_published ?? true} className="size-4 accent-zinc-900" />
        공개 지점으로 노출
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending || isUploading}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? (isPending ? "저장 중..." : "지점 저장") : isPending ? "등록 중..." : "지점 등록"}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => push(locationsPath)}>
          취소
        </Button>
        {location ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              const formData = new FormData();
              formData.set("tenantSlug", tenantSlug ?? "");
              formData.set("locationId", location.id);
              runAction(() => deleteLocationAction(formData), () => push(locationsPath));
            }}
          >
            지점 삭제
          </Button>
        ) : null}
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} />

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isUploading}
        onOpenChange={(open) => {
          setIsCropDialogOpen(open);
          if (!open) {
            setCropSourceFile(null);
          }
        }}
        onConfirm={handleCropConfirm}
        aspectRatio={cropConfig.aspectRatio}
        outputWidth={cropConfig.outputWidth}
        outputHeight={cropConfig.outputHeight}
        title={cropConfig.title}
        description={cropConfig.description}
        outputLabel={cropConfig.outputLabel}
      />
    </form>
  );
}
