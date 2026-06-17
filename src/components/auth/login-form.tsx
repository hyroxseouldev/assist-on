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
    <Button type="submit" className="mt-7 h-11 w-full gap-2 rounded-lg text-sm font-semibold" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "로그인 중..." : "어드민 로그인"}
    </Button>
  );
}

export function LoginForm({
  next,
  tenantSlug,
}: {
  next?: string;
  tenantSlug?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputId = useId();
  const resetPasswordHref = tenantSlug ? getTenantResetPasswordPath(tenantSlug) : "/reset-password";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold text-zinc-950">
          이메일
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="이메일 주소를 입력해 주세요"
          autoComplete="email"
          className="h-11 rounded-lg border-zinc-200 bg-white px-4 text-sm shadow-sm"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex w-full items-center justify-between gap-4">
          <Label htmlFor={passwordInputId} className="text-sm font-semibold text-zinc-950">
            비밀번호
          </Label>

          <Link
            href={resetPasswordHref}
            className="shrink-0 text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
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
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 pr-11 text-sm shadow-sm"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
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
