"use client";

import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { deleteCoachProfileAction, updateCoachProfileAction } from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminCoachProfileRow } from "@/lib/admin/types";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function toLineText(values: string[]) {
  return values.join("\n");
}

type CoachProfileEditFormProps = {
  tenantSlug: string;
  profile: AdminCoachProfileRow;
  canManageMembers: boolean;
  canEdit: boolean;
};

export function CoachProfileEditForm({ tenantSlug, profile, canManageMembers, canEdit }: CoachProfileEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isImageUploadPending, startImageUploadTransition] = useTransition();
  const coachesPath = `/t/${tenantSlug}/admin/coaches`;
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(profile.image_url);
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
      domainFolder: "coach-profile",
      maxDimension: 1024,
      quality: 0.9,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "program_logo",
      domainId: profile.id,
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startImageUploadTransition(async () => {
      try {
        const nextUrl = await handleUpload(croppedFile);
        setImageUrl(nextUrl);
        setCropSourceFile(null);
        setIsCropDialogOpen(false);
        toast.success("코치 대표 이미지가 업로드되었습니다.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "코치 대표 이미지 업로드에 실패했습니다.");
      }
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("imageUrl", imageUrl);

    startTransition(async () => {
      const result = await updateCoachProfileAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", profile.id);

    startTransition(async () => {
      const result = await deleteCoachProfileAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(coachesPath);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleUpdate}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={profile.is_active ? "default" : "secondary"}>{profile.is_active ? "활성" : "비활성"}</Badge>
        <p className="text-xs text-zinc-500">생성: {formatAdminDateTime(profile.created_at)}</p>
        <p className="text-xs text-zinc-500">수정: {formatAdminDateTime(profile.updated_at)}</p>
      </div>

      <input type="hidden" name="id" value={profile.id} />
      <input type="hidden" name="imageUrl" value={imageUrl} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">표시 이름</Label>
          <Input id="displayName" name="displayName" defaultValue={profile.display_name} disabled={!canEdit} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">인스타그램</Label>
          <Input id="instagram" name="instagram" defaultValue={profile.instagram} disabled={!canEdit} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>대표 이미지 (1:1)</Label>
        <div className="flex items-center gap-4 rounded-md border bg-zinc-50 p-3">
          <div className="relative size-16 overflow-hidden rounded-full border border-zinc-200 bg-white">
            <Image src={imageUrl || "/xon_logo.jpg"} alt={`${profile.display_name} 대표 이미지`} fill className="object-cover" />
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={!canEdit}
            />
            <Button type="button" variant="outline" size="sm" disabled={!canEdit || isImageUploadPending} onClick={() => fileRef.current?.click()}>
              {isImageUploadPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {isImageUploadPending ? "업로드 중..." : "대표 이미지 업로드"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">상태</Label>
        <select
          id="status"
          name="status"
          defaultValue={profile.is_active ? "active" : "inactive"}
          disabled={!canManageMembers}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="introduction">소개문</Label>
        <Textarea id="introduction" name="introduction" defaultValue={profile.introduction} rows={4} disabled={!canEdit} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="career">경력 (줄바꿈 구분)</Label>
        <Textarea id="career" name="career" defaultValue={toLineText(profile.career)} rows={8} className="min-h-40" disabled={!canEdit} />
      </div>

      {!canEdit ? <p className="text-xs text-zinc-500">owner가 아니면 자신의 코치 프로필만 수정할 수 있습니다.</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending || !canEdit}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          저장
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={() => router.push(coachesPath)}>
          목록으로
        </Button>
        {canManageMembers ? (
          <Button type="button" variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            삭제
          </Button>
        ) : null}
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isImageUploadPending}
        onOpenChange={setIsCropDialogOpen}
        onConfirm={handleCropConfirm}
        title="코치 대표 이미지 1:1 크롭"
        description="드래그와 확대/축소로 코치 대표 이미지를 맞춰 주세요."
        outputLabel="출력은 1:1 비율(1024x1024 webp)로 저장됩니다."
      />
    </form>
  );
}
