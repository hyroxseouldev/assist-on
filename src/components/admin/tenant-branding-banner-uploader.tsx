"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TenantBrandingBannerUploaderProps = {
  tenantId: string;
  teamName: string;
  bannerImageUrl: string;
  onUploaded: (nextUrl: string) => void;
};

export function TenantBrandingBannerUploader({
  tenantId,
  teamName,
  bannerImageUrl,
  onUploaded,
}: TenantBrandingBannerUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  const handleUpload = async (file: File) => {
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
      domainFolder: "tenant-branding-banner",
      maxDimension: 1600,
      quality: 0.9,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "program_logo",
      domainId: tenantId,
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

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startTransition(async () => {
      try {
        const nextUrl = await handleUpload(croppedFile);
        onUploaded(nextUrl);
        toast.success("배너 이미지가 업로드되었습니다.");
        setCropSourceFile(null);
        setIsCropDialogOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "배너 이미지 업로드에 실패했습니다.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-zinc-50 p-3 md:col-span-2">
      <p className="text-sm font-medium text-zinc-900">배너 이미지</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative aspect-[8/3] w-full max-w-sm overflow-hidden rounded-md border border-zinc-200 bg-white">
          {bannerImageUrl ? (
            <Image src={bannerImageUrl} alt={`${teamName || "브랜딩"} 배너 이미지`} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">이미지 없음</div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleChange}
        />

        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => fileRef.current?.click()}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {isPending ? "업로드 중..." : "이미지 업로드"}
        </Button>
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isPending}
        onOpenChange={setIsCropDialogOpen}
        onConfirm={handleCropConfirm}
        aspectRatio={8 / 3}
        outputWidth={1600}
        outputHeight={600}
        title="배너 이미지 8:3 크롭"
        description="드래그와 확대/축소로 배너 영역을 맞춰 주세요."
        outputLabel="출력은 8:3 비율(1600x600 webp)로 저장됩니다."
      />
    </div>
  );
}
