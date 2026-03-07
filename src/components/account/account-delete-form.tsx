"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deactivateMyAccountAction } from "@/app/actions/account";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_TEXT = "삭제합니다";

export function AccountDeleteForm() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isConfirmValid = useMemo(() => confirmText.trim() === CONFIRM_TEXT, [confirmText]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deactivateMyAccountAction(confirmText);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setOpen(false);
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 text-red-600" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-700">주의: 계정을 비활성화합니다.</p>
          <p className="text-sm text-red-700/90">
            비활성화 후에는 로그인할 수 없고, 활성 구독은 해지 예약 처리됩니다.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-delete-confirm">확인을 위해 문구를 입력해 주세요</Label>
        <Input
          id="account-delete-confirm"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={CONFIRM_TEXT}
        />
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" className="h-10" disabled={!isConfirmValid || isPending}>
            계정 삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업을 진행하면 계정은 비활성화되고 즉시 로그아웃됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={handleDelete}
              disabled={!isConfirmValid || isPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "처리 중..." : "삭제 진행"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
