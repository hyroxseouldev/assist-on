"use client";

import Link from "next/link";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginActionState } from "@/app/(auth)/tenant/login/actions";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full gap-2" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "로그인 중..." : "로그인"}
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">이메일로 로그인</h2>
        <p className="text-sm leading-6 text-zinc-500">기존 기능은 그대로 두고, 모바일 앱처럼 입력 흐름만 더 가볍게 정리했어요.</p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />

        <div className="space-y-2">
          <Label htmlFor="email" className="px-1 text-sm font-medium text-zinc-700">
            이메일
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 pl-11 shadow-none placeholder:text-zinc-400 focus-visible:bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="px-1 text-sm font-medium text-zinc-700">
            비밀번호
          </Label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
              required
              className="h-14 rounded-2xl border-zinc-200 bg-zinc-50 pl-11 shadow-none placeholder:text-zinc-400 focus-visible:bg-white"
            />
          </div>
        </div>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>로그인 실패</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3 pt-2">
          <SubmitButton />

          <div className="flex w-full items-center justify-end px-1 text-sm text-zinc-500">
            <Link href="/reset-password" className="underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-900">
              비밀번호 찾기
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
