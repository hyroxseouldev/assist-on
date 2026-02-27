"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { userSignupAction, type UserSignupActionState } from "@/app/(auth)/signup/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: UserSignupActionState = { error: null, success: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full gap-2" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? "가입 중..." : "가입하고 참여"}
    </Button>
  );
}

export function UserSignupForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(userSignupAction, initialState);

  return (
    <Card className="border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl">가입하기</CardTitle>
        <CardDescription>초대받은 테넌트에 참여할 계정을 만듭니다.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" type="text" placeholder="홍길동" autoComplete="name" required />
          </div>

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
              autoComplete="new-password"
              required
            />
          </div>

          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>가입 실패</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.success ? (
            <Alert>
              <AlertTitle>가입 완료</AlertTitle>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          ) : null}

          <SubmitButton />
        </form>
      </CardContent>

      <CardFooter className="block space-y-4">
        <Separator />
        <div className="flex items-center justify-end text-sm text-zinc-600">
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            이미 계정이 있나요? 로그인
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
