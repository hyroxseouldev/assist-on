"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "@/app/(auth)/tenant/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantResetPasswordPath } from "@/lib/auth/paths";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" appearance="login" className="mt-3 h-12 w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "로그인 중..." : "워크스페이스 로그인"}
    </Button>
  );
}

export function LoginForm({
  tenantSlug,
}: {
  tenantSlug?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputId = useId();
  const resetPasswordHref = tenantSlug ? getTenantResetPasswordPath(tenantSlug) : "/reset-password";

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold text-ink-emphasis">
          이메일
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="이메일 주소를 입력해 주세요"
          autoComplete="email"
          appearance="login" className="h-12"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex w-full items-center justify-between gap-4">
          <Label htmlFor={passwordInputId} className="text-sm font-semibold text-ink-emphasis">
            비밀번호
          </Label>

          <Link
            href={resetPasswordHref}
            className="shrink-0 rounded-sm text-xs font-medium text-ink-subtle transition hover:text-success-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-success-ink"
          >
            비밀번호 찾기
          </Link>
        </div>

        <div className="relative">
          <Input
            id={passwordInputId}
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="비밀번호를 입력해 주세요"
            autoComplete="current-password"
            appearance="password" className="h-12"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-subtle transition hover:text-ink-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-strong"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>로그인 실패</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />
    </form>
  );
}
