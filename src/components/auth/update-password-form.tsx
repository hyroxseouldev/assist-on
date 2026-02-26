"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePasswordAction, type UpdatePasswordActionState } from "@/app/(auth)/update-password/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: UpdatePasswordActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "변경 중..." : "비밀번호 변경"}
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">새 비밀번호 설정</CardTitle>
        <CardDescription>안전한 계정을 위해 8자 이상의 비밀번호를 입력해 주세요.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="새 비밀번호"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">새 비밀번호 확인</Label>
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              placeholder="새 비밀번호 확인"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>변경 실패</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
