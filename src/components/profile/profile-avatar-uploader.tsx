"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction, updateMyAvatarUrlAction } from "@/app/actions/media";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileAvatarUploaderProps = {
  displayName: string;
  avatarUrl?: string;
};

export function ProfileAvatarUploader({ displayName, avatarUrl }: ProfileAvatarUploaderProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const fallback = displayName.slice(0, 1).toUpperCase();

  const handleSelectAvatar = async (file: File) => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("로그인이 필요합니다.");
    }

    const uploaded = await uploadImageToStorage(file, {
      bucket: "avatars",
      userId: user.id,
      domainFolder: "avatars",
      maxDimension: 512,
      quality: 0.82,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "profile_avatar",
      domainId: user.id,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
    });

    if (!mediaResult.ok) {
      throw new Error(mediaResult.message);
    }

    const profileResult = await updateMyAvatarUrlAction(uploaded.publicUrl);
    if (!profileResult.ok) {
      throw new Error(profileResult.message);
    }
  };

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    startTransition(async () => {
      try {
        await handleSelectAvatar(file);
        toast.success("프로필 사진이 업데이트되었습니다.");
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "프로필 사진 업로드에 실패했습니다.";
        toast.error(message);
      } finally {
        event.target.value = "";
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleUploadFile}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => fileRef.current?.click()}
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {isPending ? "업로드 중..." : "사진 변경"}
      </Button>
    </div>
  );
}
