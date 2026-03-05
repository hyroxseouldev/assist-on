"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { createTenantProgramAction, deleteTenantProgramAction, updateTenantProgramAction } from "@/lib/admin/actions";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProgramListRow } from "@/lib/admin/types";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProgramEditorFormProps = {
  tenantSlug: string;
  program?: AdminProgramListRow;
};

export function ProgramEditorForm({ tenantSlug, program }: ProgramEditorFormProps) {
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isThumbnailUploadPending, startThumbnailUploadTransition] = useTransition();
  const [thumbnailUrl, setThumbnailUrl] = useState(program?.thumbnail_url || "");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUploadThumbnail = async (croppedFile: File) => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("이미지 업로드를 위해 로그인이 필요합니다.");
    }

    const uploaded = await uploadImageToStorage(croppedFile, {
      bucket: "content-media",
      userId: user.id,
      domainFolder: "program-thumbnail",
      maxDimension: 1024,
      quality: 0.9,
    });

    const mediaResult = await registerMediaAssetAction({
      bucket: uploaded.bucket,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      domainType: "program_logo",
      domainId: program?.id,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
    });

    if (!mediaResult.ok) {
      throw new Error(mediaResult.message);
    }

    setThumbnailUrl(uploaded.publicUrl);
    setIsCropDialogOpen(false);
    setCropSourceFile(null);
    toast.success("썸네일 이미지가 업로드되었습니다.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("thumbnailUrl", thumbnailUrl);

    startSaveTransition(async () => {
      const result = program ? await updateTenantProgramAction(formData) : await createTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        if (!program) {
          if (result.programId) {
            router.push(`/t/${tenantSlug}/admin/program/${result.programId}`);
          } else {
            router.refresh();
            formElement.reset();
          }
        }
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleThumbnailFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startThumbnailUploadTransition(async () => {
      try {
        await handleUploadThumbnail(croppedFile);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "썸네일 업로드에 실패했습니다.");
      }
    });
  };

  const handleDelete = () => {
    if (!program) {
      return;
    }

    const confirmed = window.confirm("이 프로그램을 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("id", program.id);

    startDeleteTransition(async () => {
      const result = await deleteTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(`/t/${tenantSlug}/admin/program`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      {program ? <input type="hidden" name="id" value={program.id} /> : null}

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="title">프로그램명</Label>
        <Input id="title" name="title" defaultValue={program?.title ?? ""} required />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">설명</Label>
        <Textarea id="description" name="description" defaultValue={program?.description ?? ""} rows={5} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="difficulty">난이도</Label>
        <select
          id="difficulty"
          name="difficulty"
          defaultValue={program?.difficulty ?? "intermediate"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="beginner">초급</option>
          <option value="intermediate">중급</option>
          <option value="advanced">고급</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dailyWorkoutMinutes">하루 운동 시간(분)</Label>
        <Input
          id="dailyWorkoutMinutes"
          name="dailyWorkoutMinutes"
          type="number"
          min={10}
          max={300}
          step={5}
          defaultValue={program?.daily_workout_minutes ?? 60}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="daysPerWeek">주당 운동일</Label>
        <Input
          id="daysPerWeek"
          name="daysPerWeek"
          type="number"
          min={1}
          max={7}
          step={1}
          defaultValue={program?.days_per_week ?? 5}
          required
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>썸네일</Label>
        <div className="flex items-center gap-4 rounded-md border bg-zinc-50 p-3">
          <div className="relative size-16 overflow-hidden rounded-md border border-zinc-200 bg-white">
            <Image src={thumbnailUrl || "/xon_logo.jpg"} alt="프로그램 썸네일" fill className="object-cover" />
          </div>
          <div className="space-y-2">
            <input
              ref={thumbnailFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleThumbnailFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isThumbnailUploadPending}
              onClick={() => thumbnailFileRef.current?.click()}
            >
              {isThumbnailUploadPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {isThumbnailUploadPending ? "업로드 중..." : "썸네일 업로드 (1:1)"}
            </Button>
            <p className="text-xs text-zinc-500">업로드 전에 정사각 비율(1:1)로 크롭할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="startDate">시작일</Label>
        <Input id="startDate" name="startDate" type="date" defaultValue={program?.start_date ?? ""} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">종료일</Label>
        <Input id="endDate" name="endDate" type="date" defaultValue={program?.end_date ?? ""} required />
      </div>

      <div className="md:col-span-2 flex items-center gap-2">
        <Button type="submit" disabled={isSavePending}>
          {isSavePending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSavePending ? "저장 중..." : program ? "프로그램 저장" : "프로그램 생성"}
        </Button>

        {program ? (
          <Button type="button" variant="destructive" disabled={isDeletePending} onClick={handleDelete}>
            {isDeletePending ? <Loader2 className="size-4 animate-spin" /> : null}
            프로그램 삭제
          </Button>
        ) : null}
      </div>

      <SquareImageCropDialog
        open={isCropDialogOpen}
        file={cropSourceFile}
        isSubmitting={isThumbnailUploadPending}
        onOpenChange={setIsCropDialogOpen}
        onConfirm={handleCropConfirm}
      />
    </form>
  );
}
