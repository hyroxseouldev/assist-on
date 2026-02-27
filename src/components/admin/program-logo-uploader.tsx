"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { updateProgramLogoAction } from "@/lib/admin/actions";
import { registerMediaAssetAction } from "@/app/actions/media";
import { Button } from "@/components/ui/button";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProgramLogoUploaderProps = {
  programId: string;
  teamName: string;
  logoUrl: string;
};

export function ProgramLogoUploader({ programId, teamName, logoUrl }: ProgramLogoUploaderProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const currentLogoUrl = logoUrl || "/xon_logo.jpg";

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
      domainFolder: "program-logo",
      maxDimension: 1024,
      quality: 0.9,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "program_logo",
      domainId: programId,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
    });

    if (!mediaResult.ok) {
      throw new Error(mediaResult.message);
    }

    const updateResult = await updateProgramLogoAction(programId, uploaded.publicUrl);
    if (!updateResult.ok) {
      throw new Error(updateResult.message);
    }

    return updateResult.message;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    startTransition(async () => {
      try {
        const message = await handleUpload(file);
        toast.success(message);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "프로그램 로고 업로드에 실패했습니다.";
        toast.error(message);
      } finally {
        event.target.value = "";
      }
    });
  };

  return (
    <div className="space-y-3 rounded-md border bg-zinc-50 p-3">
      <p className="text-sm font-medium text-zinc-900">대표 로고</p>

      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <Image src={currentLogoUrl} alt={`${teamName} 로고`} fill className="object-cover" />
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
          {isPending ? "업로드 중..." : "로고 업로드"}
        </Button>
      </div>
    </div>
  );
}
