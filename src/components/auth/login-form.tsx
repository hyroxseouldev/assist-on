"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MockAuthService } from "@/lib/auth/mock-auth-service";

const authService = new MockAuthService();

type SubmitStatus = {
  type: "success" | "error";
  message: string;
} | null;

export function LoginForm() {
  const [status, setStatus] = useState<SubmitStatus>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setStatus(null);

    startTransition(async () => {
      const result = await authService.signInWithPassword(email, password);

      setStatus({
        type: result.success ? "success" : "error",
        message: result.message,
      });
    });
  };

  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">로그인</CardTitle>
        <CardDescription>오늘의 세션을 확인하고 훈련을 시작하세요.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
              required
            />
          </div>

          {status ? (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              <AlertTitle>{status.type === "error" ? "로그인 실패" : "로그인 성공"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="block space-y-4">
        <Separator />
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <Link href="#" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            회원가입
          </Link>
          <Link href="#" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            비밀번호 찾기
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
