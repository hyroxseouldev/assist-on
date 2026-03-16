"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" role="img">
      <path
        d="M21.35 11.1H12v2.84h5.36c-.23 1.49-1.74 4.36-5.36 4.36-3.22 0-5.85-2.66-5.85-5.94s2.63-5.94 5.85-5.94c1.83 0 3.06.79 3.76 1.46l2.56-2.47C16.69 3.88 14.58 3 12 3 6.97 3 2.89 7.08 2.89 12.12S6.97 21.24 12 21.24c6.02 0 9.11-4.23 9.11-10.19 0-.69-.07-1.2-.16-1.95Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function UserLoginForm({
  next,
  brandName,
  logoUrl,
}: {
  next?: string;
  brandName?: string;
  logoUrl?: string;
}) {
  const [oauthPending, setOauthPending] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    if (oauthPending) {
      return;
    }

    const isSafeInternalPath = Boolean(next && next.startsWith("/") && !next.startsWith("//"));
    const safeNext = isSafeInternalPath ? next! : "/t/select";
    const redirectUrl = new URL("/auth/confirm", window.location.origin);
    redirectUrl.searchParams.set("next", safeNext);

    setOauthPending(true);
    setOauthError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      setOauthError("Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setOauthPending(false);
    }
  };

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
        <CardTitle className="text-xl">로그인</CardTitle>
        <CardDescription>Google 계정으로 사용자 워크스페이스에 로그인해 주세요.</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pt-2 pb-6">
        {oauthError ? (
          <Alert variant="destructive" className="mb-3">
            <AlertTitle>Google 로그인 실패</AlertTitle>
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          className="mt-10 h-14 w-full gap-3 text-base font-semibold"
          onClick={handleGoogleLogin}
          disabled={oauthPending}
        >
          {oauthPending ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
          {oauthPending ? "Google 로그인 준비 중..." : "Google로 로그인"}
        </Button>

        <p className="mt-4 text-center text-xs text-zinc-500">소셜 로그인만 지원합니다.</p>
      </CardContent>
    </Card>
  );
}
