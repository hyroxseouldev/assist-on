"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { userLoginAction, type UserLoginActionState } from "@/app/(auth)/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: UserLoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full gap-2" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "로그인 중..." : "로그인"}
    </Button>
  );
}

export function UserLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(userLoginAction, initialState);

  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">로그인</CardTitle>
        <CardDescription>초대받은 테넌트로 입장하려면 로그인해 주세요.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
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

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>로그인 실패</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>

      <CardFooter className="block space-y-4">
        <Separator />
        <div className="flex items-center justify-end text-sm text-zinc-600">
          <Link href="/reset-password" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            비밀번호 찾기
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
