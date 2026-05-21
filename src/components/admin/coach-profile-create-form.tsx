"use client";

import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { registerMediaAssetAction } from "@/app/actions/media";
import { createCoachProfileAction } from "@/lib/admin/actions";
import type { AdminCoachProfileCandidate } from "@/lib/admin/types";
import { SquareImageCropDialog } from "@/components/media/square-image-crop-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImageToStorage } from "@/lib/media/upload-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function getRoleLabel(role: "owner" | "coach" | "member") {
  if (role === "owner") return "Owner";
  if (role === "coach") return "Coach";
  return "Member";
}

const MAX_ADDITIONAL_IMAGES = 6;

type CoachProfileCreateFormProps = {
  tenantSlug: string;
  tenantId: string;
  candidates: AdminCoachProfileCandidate[];
  canManageMembers: boolean;
};

export function CoachProfileCreateForm({ tenantSlug, tenantId, candidates, canManageMembers }: CoachProfileCreateFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const additionalFileRef = useRef<HTMLInputElement>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.user_id ?? "");
  const [displayName, setDisplayName] = useState(candidates[0]?.full_name ?? "");
  const [imageUrl, setImageUrl] = useState("");
  const [additionalImageUrls, setAdditionalImageUrls] = useState<string[]>([]);
  const [cropSourceFile, setCropSourceFile] = useState<File | null>(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [additionalCropSourceFile, setAdditionalCropSourceFile] = useState<File | null>(null);
  const [isAdditionalCropDialogOpen, setIsAdditionalCropDialogOpen] = useState(false);
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isImageUploadPending, startImageUploadTransition] = useTransition();
  const [isAdditionalImageUploadPending, startAdditionalImageUploadTransition] = useTransition();

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.user_id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId]
  );

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setCropSourceFile(file);
    setIsCropDialogOpen(true);
  };

  const handleAdditionalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || additionalImageUrls.length >= MAX_ADDITIONAL_IMAGES) {
      return;
    }

    setAdditionalCropSourceFile(file);
    setIsAdditionalCropDialogOpen(true);
  };

  const handleCropConfirm = (croppedFile: File) => {
    startImageUploadTransition(async () => {
      try {
        const nextUrl = await handleUpload(croppedFile);
        setImageUrl(nextUrl);
        toast.success("코치 대표 이미지가 업로드되었습니다.");
        setCropSourceFile(null);
        setIsCropDialogOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "코치 대표 이미지 업로드에 실패했습니다.");
      }
    });
  };

  const handleAdditionalCropConfirm = (croppedFile: File) => {
    startAdditionalImageUploadTransition(async () => {
      try {
        const nextUrl = await handleUpload(croppedFile);
        setAdditionalImageUrls((previous) => (previous.length >= MAX_ADDITIONAL_IMAGES ? previous : [...previous, nextUrl]));
        toast.success("코치 추가 이미지가 업로드되었습니다.");
        setAdditionalCropSourceFile(null);
        setIsAdditionalCropDialogOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "코치 추가 이미지 업로드에 실패했습니다.");
      }
    });
  };

  const moveAdditionalImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= additionalImageUrls.length) {
      return;
    }

    setAdditionalImageUrls((previous) => {
      const cloned = [...previous];
      const [selected] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, selected);
      return cloned;
    });
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImageUrls((previous) => previous.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("tenantSlug", tenantSlug);
    formData.set("imageUrl", imageUrl);
    formData.set("additionalImageUrls", JSON.stringify(additionalImageUrls));

    startCreateTransition(async () => {
      const result = await createCoachProfileAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.push(`/t/${tenantSlug}/admin/coaches`);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>코치 프로필 생성</CardTitle>
        <CardDescription>owner 또는 coach 권한이 있는 내부 멤버를 코치 프로필로 등록합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {!canManageMembers ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            owner만 코치 프로필을 생성할 수 있습니다.
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            등록 가능한 코치 계정이 없습니다. 먼저 `유저 정보 관리`에서 owner 또는 coach 권한을 부여해 주세요.
          </div>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-user-id">계정 선택</Label>
              <select
                id="create-user-id"
                name="userId"
                value={selectedCandidateId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const nextCandidate = candidates.find((candidate) => candidate.user_id === nextId);
                  setSelectedCandidateId(nextId);
                  setDisplayName(nextCandidate?.full_name ?? "");
                }}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                {candidates.map((candidate) => (
                  <option key={candidate.user_id} value={candidate.user_id}>
                    {candidate.full_name} {candidate.email ? `(${candidate.email})` : ""}
                  </option>
                ))}
              </select>
              {selectedCandidate ? (
                <p className="text-xs text-zinc-500">
                  역할: {getRoleLabel(selectedCandidate.role)}
                  {selectedCandidate.email ? ` · ${selectedCandidate.email}` : ""}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-display-name">표시 이름</Label>
              <Input id="create-display-name" name="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-instagram">인스타그램</Label>
              <Input id="create-instagram" name="instagram" placeholder="@coach_handle" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">상태</Label>
              <select
                id="create-status"
                name="status"
                defaultValue="active"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>

            <div className="space-y-3 rounded-md border bg-zinc-50 p-3 md:col-span-2">
              <p className="text-sm font-medium text-zinc-900">대표 이미지</p>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-white">
                  <Image src={imageUrl || "/logo.png"} alt={`${displayName || "코치"} 대표 이미지`} fill className="object-cover" />
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" size="sm" disabled={isImageUploadPending} onClick={() => fileRef.current?.click()}>
                  {isImageUploadPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {isImageUploadPending ? "업로드 중..." : "이미지 업로드"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-md border bg-zinc-50 p-3 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">추가 이미지</p>
                  <p className="text-xs text-zinc-500">최대 {MAX_ADDITIONAL_IMAGES}장까지 등록할 수 있습니다.</p>
                </div>
                <input
                  ref={additionalFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAdditionalFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAdditionalImageUploadPending || additionalImageUrls.length >= MAX_ADDITIONAL_IMAGES}
                  onClick={() => additionalFileRef.current?.click()}
                >
                  {isAdditionalImageUploadPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  {isAdditionalImageUploadPending ? "업로드 중..." : "추가 이미지 업로드"}
                </Button>
              </div>

              {additionalImageUrls.length === 0 ? <p className="text-xs text-zinc-500">등록된 추가 이미지가 없습니다.</p> : null}

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {additionalImageUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="rounded-md border border-zinc-200 bg-white p-2">
                    <div className="relative aspect-square overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                      <Image src={url} alt={`추가 이미지 ${index + 1}`} fill className="object-cover" />
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => moveAdditionalImage(index, -1)} disabled={index === 0}>
                        위로
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveAdditionalImage(index, 1)}
                        disabled={index === additionalImageUrls.length - 1}
                      >
                        아래로
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removeAdditionalImage(index)}>
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-introduction">한 줄 소개 / 소개문</Label>
              <Textarea id="create-introduction" name="introduction" rows={4} placeholder="코치 소개를 입력해 주세요." />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-career">경력 (줄바꿈 구분)</Label>
              <Textarea id="create-career" name="career" rows={8} placeholder="국가대표 트레이너\n재활 운동 8년" className="min-h-40" />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isCreatePending}>
                {isCreatePending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isCreatePending ? "생성 중..." : "코치 프로필 생성"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push(`/t/${tenantSlug}/admin/coaches`)}>
                목록으로
              </Button>
            </div>
          </form>
        )}

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
        <SquareImageCropDialog
          open={isAdditionalCropDialogOpen}
          file={additionalCropSourceFile}
          isSubmitting={isAdditionalImageUploadPending}
          onOpenChange={setIsAdditionalCropDialogOpen}
          onConfirm={handleAdditionalCropConfirm}
          title="코치 추가 이미지 1:1 크롭"
          description="드래그와 확대/축소로 코치 추가 이미지를 맞춰 주세요."
          outputLabel="출력은 1:1 비율(1024x1024 webp)로 저장됩니다."
        />
      </CardContent>
    </Card>
  );
}
