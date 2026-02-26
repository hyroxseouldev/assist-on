"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestPasswordResetAction, type ResetPasswordActionState } from "@/app/(auth)/reset-password/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: ResetPasswordActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "전송 중..." : "재설정 메일 보내기"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">비밀번호 재설정</CardTitle>
        <CardDescription>가입한 이메일로 재설정 링크를 보내드립니다.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>전송 실패</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert>
              <AlertTitle>전송 완료</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>

      <CardFooter className="block space-y-4">
        <Separator />
        <div className="text-sm text-zinc-600">
          계정이 기억났나요?{" "}
          <Link href="/login" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            로그인으로 이동
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
