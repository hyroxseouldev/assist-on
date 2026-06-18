"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import {
  createProgramCohortAction,
  createTenantProgramAction,
  deleteProgramCohortAction,
  deleteTenantProgramAction,
  updateProgramCohortAction,
  updateTenantProgramAction,
} from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProgramCohortRow, AdminProgramEditorRow, ProgramDeliveryMode } from "@/lib/admin/types";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function formatMobileVisibility(value: AdminProgramEditorRow["mobile_visibility"]) {
  if (value === "members_only") return "구매 멤버만 공개";
  if (value === "private") return "비공개";
  return "공개";
}

type ProgramEditorFormProps = {
  tenantSlug: string;
  program?: AdminProgramEditorRow;
  canManageCoachAssignments?: boolean;
};

function ProgramCohortsManager({
  tenantSlug,
  programId,
  cohorts,
}: {
  tenantSlug: string;
  programId: string;
  cohorts: AdminProgramCohortRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("tenantSlug", tenantSlug);
    formData.set("programId", programId);
    formData.set("isDefault", formData.get("isDefault") === "on" ? "true" : "false");

    startTransition(async () => {
      const result = await createProgramCohortAction(formData);
      if (result.ok) {
        toast.success(result.message);
        form.reset();
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  const handleUpdate = (event: FormEvent<HTMLFormElement>, cohortId: string) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("programId", programId);
    formData.set("cohortId", cohortId);
    formData.set("isDefault", formData.get("isDefault") === "on" ? "true" : "false");

    startTransition(async () => {
      const result = await updateProgramCohortAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  const handleDelete = (cohortId: string) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug);
    formData.set("programId", programId);
    formData.set("cohortId", cohortId);

    startTransition(async () => {
      const result = await deleteProgramCohortAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <div className="space-y-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
      <div>
        <Label>기수 관리</Label>
        <p className="mt-1 text-xs text-zinc-500">유저별 실제 시작일을 기수로 관리합니다. 권한에 사용 중인 기수는 삭제할 수 없습니다.</p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[1fr_160px_auto_auto]" onSubmit={handleCreate}>
        <Input name="name" placeholder="예: 2기" required />
        <Input name="startsOn" type="date" required />
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input name="isDefault" type="checkbox" className="size-4 rounded border-zinc-300" />
          기본
        </label>
        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          추가
        </Button>
      </form>

      {cohorts.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
          등록된 기수가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {cohorts.map((cohort) => (
            <form
              key={cohort.id}
              className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_160px_auto_auto_auto]"
              onSubmit={(event) => handleUpdate(event, cohort.id)}
            >
              <Input name="name" defaultValue={cohort.name} required />
              <Input name="startsOn" type="date" defaultValue={cohort.starts_on} required />
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input name="isDefault" type="checkbox" defaultChecked={cohort.is_default} className="size-4 rounded border-zinc-300" />
                기본
              </label>
              <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
                저장
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleDelete(cohort.id)}>
                삭제
              </Button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgramEditorForm({ tenantSlug, program, canManageCoachAssignments = false }: ProgramEditorFormProps) {
  const [isSavePending, startSaveTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isThumbnailUploadPending, startThumbnailUploadTransition] = useTransition();
  const [thumbnailUrl, setThumbnailUrl] = useState(program?.thumbnail_url || "");
  const [deliveryMode, setDeliveryMode] = useState<ProgramDeliveryMode>(program?.delivery_mode ?? "fixed_date");
  const [selectedCoachProfileIds, setSelectedCoachProfileIds] = useState<string[]>(program?.selected_coach_profile_ids ?? []);
  const [primaryCoachProfileId, setPrimaryCoachProfileId] = useState<string>(program?.primary_coach_profile_id ?? "");
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { push } = useAdminNavigation();

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
    formData.set("tenantSlug", tenantSlug);
    formData.set("thumbnailUrl", thumbnailUrl);
    formData.delete("coachProfileIds");
    selectedCoachProfileIds.forEach((coachProfileId) => formData.append("coachProfileIds", coachProfileId));
    formData.set("primaryCoachProfileId", primaryCoachProfileId);

    startSaveTransition(async () => {
      const result = program ? await updateTenantProgramAction(formData) : await createTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        if (!program) {
          if (result.programId) {
            push(`/admin/program/${result.programId}`);
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

    const confirmed = window.confirm(
      "이 프로그램을 삭제하면 연결된 세션과 세션 리뷰도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다. 계속할까요?"
    );
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug);
    formData.set("id", program.id);
    formData.set("confirmCascadeDelete", "true");

    startDeleteTransition(async () => {
      const result = await deleteTenantProgramAction(formData);
      if (result.ok) {
        toast.success(result.message);
        push("/admin/program");
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleCoachToggle = (coachProfileId: string, checked: boolean) => {
    setSelectedCoachProfileIds((current) => {
      const next = checked ? [...current, coachProfileId] : current.filter((id) => id !== coachProfileId);

      if (!checked && primaryCoachProfileId === coachProfileId) {
        setPrimaryCoachProfileId(next[0] ?? "");
      }

      if (checked && !primaryCoachProfileId) {
        setPrimaryCoachProfileId(coachProfileId);
      }

      return next;
    });
  };

  return (
    <>
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

      {program ? (
        <div className="space-y-3 md:col-span-2">
          <div className="space-y-1">
            <Label>담당 코치</Label>
            <p className="text-xs text-zinc-500">대표 코치 1명을 지정하고, 함께 노출할 코치를 선택합니다.</p>
          </div>

          {!canManageCoachAssignments ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              담당 코치 지정은 owner만 변경할 수 있습니다.
            </div>
          ) : null}

          {program.available_coaches.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              등록된 코치 프로필이 없습니다. 먼저 `코치 관리`에서 코치 프로필을 생성해 주세요.
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
              {program.available_coaches.map((coach) => {
                const checked = selectedCoachProfileIds.includes(coach.id);
                const isPrimary = primaryCoachProfileId === coach.id;

                return (
                  <div
                    key={coach.id}
                    className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleCoachToggle(coach.id, event.target.checked)}
                        disabled={!canManageCoachAssignments}
                        className="mt-1 size-4 rounded border-zinc-300"
                      />
                      <div>
                        <p className="font-medium text-zinc-900">{coach.display_name}</p>
                        <p className="text-sm text-zinc-500">
                          {coach.instagram ? `@${coach.instagram.replace(/^@/, "")}` : "인스타그램 미입력"}
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-600">
                      <input
                        type="radio"
                        name="primaryCoachSelector"
                        checked={isPrimary}
                        disabled={!checked || !canManageCoachAssignments}
                        onChange={() => setPrimaryCoachProfileId(coach.id)}
                        className="size-4 border-zinc-300"
                      />
                      대표 코치
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="displayOrder">노출 우선순위</Label>
        <Input id="displayOrder" name="displayOrder" type="number" min={0} step={1} defaultValue={program?.display_order ?? 0} required />
        <p className="text-xs text-zinc-500">숫자가 낮을수록 모바일에서 먼저 노출됩니다.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobileVisibility">모바일 공개 상태</Label>
        <select
          id="mobileVisibility"
          name="mobileVisibility"
          defaultValue={program?.mobile_visibility ?? "public"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="public">{formatMobileVisibility("public")}</option>
          <option value="members_only">{formatMobileVisibility("members_only")}</option>
          <option value="private">{formatMobileVisibility("private")}</option>
        </select>
        <p className="text-xs text-zinc-500">모바일 앱에서 프로그램 목록/상세 노출을 제어하는 값입니다.</p>
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
            <Image src={thumbnailUrl || "/logo.png"} alt="프로그램 썸네일" fill className="object-cover" />
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

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="deliveryMode">운영 방식</Label>
        <select
          id="deliveryMode"
          name="deliveryMode"
          value={deliveryMode}
          onChange={(event) => setDeliveryMode(event.target.value as ProgramDeliveryMode)}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="fixed_date">고정 날짜</option>
          <option value="cohort_based">기수제</option>
        </select>
      </div>

      {deliveryMode === "cohort_based" ? (
        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 md:col-span-2">
          <p className="text-xs text-zinc-500">
            운동 입력 날짜는 콘텐츠 기준일로 저장되고, 유저별 실제 시작일은 기수에서 결정됩니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contentStartsOn">콘텐츠 기준 시작일</Label>
              <Input id="contentStartsOn" name="contentStartsOn" type="date" defaultValue={program?.content_starts_on ?? program?.start_date ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contentEndsOn">콘텐츠 기준 종료일</Label>
              <Input id="contentEndsOn" name="contentEndsOn" type="date" defaultValue={program?.content_ends_on ?? program?.end_date ?? ""} required />
            </div>
          </div>
        </div>
      ) : null}

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
    {program && deliveryMode === "cohort_based" ? (
      <div className="mt-4">
        <ProgramCohortsManager tenantSlug={tenantSlug} programId={program.id} cohorts={program.cohorts} />
      </div>
    ) : null}
    </>
  );
}
