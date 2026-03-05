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

type TenantBrandingCoachImageUploaderProps = {
  tenantId: string;
  coachName: string;
  imageUrl: string;
  onUploaded: (nextUrl: string) => void;
};

export function TenantBrandingCoachImageUploader({
  tenantId,
  coachName,
  imageUrl,
  onUploaded,
}: TenantBrandingCoachImageUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  const currentImageUrl = imageUrl || "/xon_logo.jpg";

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
      domainFolder: "tenant-branding-coach",
      maxDimension: 1024,
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
        toast.success("코치 대표 이미지가 업로드되었습니다.");
        setCropSourceFile(null);
        setIsCropDialogOpen(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "코치 대표 이미지 업로드에 실패했습니다.";
        toast.error(message);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-zinc-50 p-3 md:col-span-2">
      <p className="text-sm font-medium text-zinc-900">코치 대표 이미지</p>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-white">
          <Image src={currentImageUrl} alt={`${coachName || "코치"} 대표 이미지`} fill className="object-cover" />
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
      />
    </div>
  );
}
