"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { changeMyPasswordAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AdminPasswordDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

function getPasswordHints(password: string) {
  return {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function AdminPasswordDialog({ trigger, open, onOpenChange, hideTrigger = false }: AdminPasswordDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isControlled = typeof open === "boolean";
  const currentOpen = open ?? internalOpen;
  const passwordHints = getPasswordHints(password);
  const passwordHintOk = passwordHints.minLength && passwordHints.hasLetter && passwordHints.hasNumber;
  const hasConfirmInput = passwordConfirm.length > 0;
  const passwordMatches = password === passwordConfirm;
  const canSubmit = passwordHintOk && hasConfirmInput && passwordMatches;

  const resetForm = () => {
    setPassword("");
    setPasswordConfirm("");
    setErrorMessage(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await changeMyPasswordAction(formData);

      if (result.ok) {
        toast.success(result.message);
        resetForm();
        handleOpenChange(false);
        return;
      }

      setErrorMessage(result.message);
    });
  };

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" className="w-full">
              비밀번호 변경
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <DialogDescription>안전한 계정을 위해 8자 이상의 비밀번호를 입력해 주세요.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-password">새 비밀번호</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              placeholder="새 비밀번호"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              required
            />
            <p className={passwordHintOk ? "text-xs text-emerald-700" : "text-xs text-zinc-500"}>
              8자 이상, 영문/숫자를 포함해 주세요.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password-confirm">새 비밀번호 확인</Label>
            <Input
              id="admin-password-confirm"
              name="passwordConfirm"
              type="password"
              placeholder="새 비밀번호 확인"
              autoComplete="new-password"
              minLength={8}
              aria-invalid={hasConfirmInput && !passwordMatches}
              value={passwordConfirm}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              required
            />
            {hasConfirmInput ? (
              <p className={passwordMatches ? "text-xs text-emerald-700" : "text-xs text-red-600"}>
                {passwordMatches ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
              </p>
            ) : null}
          </div>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                취소
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "변경 중..." : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
