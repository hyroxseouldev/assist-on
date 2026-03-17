"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "@/app/(auth)/tenant/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTenantResetPasswordPath } from "@/lib/auth/paths";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="mt-10 h-14 w-full gap-2 text-base font-semibold" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "로그인 중..." : "로그인"}
    </Button>
  );
}

export function LoginForm({
  next,
  tenantSlug,
  brandName,
  logoUrl,
}: {
  next?: string;
  tenantSlug?: string;
  brandName?: string;
  logoUrl?: string;
}) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const resetPasswordHref = tenantSlug ? getTenantResetPasswordPath(tenantSlug) : "/reset-password";

  return (
    <Card className="border-none bg-white shadow-none">
      <CardHeader className="items-start px-6 pt-6 pb-2 text-left">
        <Image
          src={logoUrl || "/logo.png"}
          alt="logo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-md border border-zinc-200 object-contain p-1"
        />
        <p className="text-base font-bold">{brandName}</p>
        <CardTitle className="text-xl">관리자 로그인</CardTitle>
        <CardDescription>이메일과 비밀번호로 테넌트 어드민 워크스페이스에 로그인해 주세요.</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pt-2 pb-6">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="next" value={next ?? ""} />

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
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="password" className="w-full">
                비밀번호
              </Label>

              <div className="flex w-full items-center justify-end text-sm text-zinc-600">
                <Link href={resetPasswordHref} className="hover:text-zinc-900">
                  비밀번호 찾기
                </Link>
              </div>
            </div>

            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력해 주세요"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>로그인 실패</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
