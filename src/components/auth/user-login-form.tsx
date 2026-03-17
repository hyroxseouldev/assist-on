"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSafeInternalPath } from "@/lib/auth/redirects";
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

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" role="img">
      <path
        d="M16.68 12.61c.01 1.6 1.4 2.14 1.41 2.14-.01.04-.22.78-.73 1.54-.44.66-.89 1.31-1.61 1.33-.7.03-.92-.42-1.72-.42s-1.04.4-1.7.43c-.69.03-1.21-.69-1.65-1.34-.89-1.29-1.57-3.65-.66-5.23.45-.78 1.26-1.27 2.14-1.29.67-.01 1.3.45 1.72.45.41 0 1.19-.56 2-.48.34.01 1.31.14 1.93 1.05-.05.03-1.15.67-1.14 1.82Zm-1.11-3.33c.37-.45.62-1.08.55-1.71-.54.02-1.19.36-1.57.81-.35.4-.66 1.04-.58 1.65.6.05 1.23-.31 1.6-.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

type SocialProvider = "google" | "apple";

export function UserLoginForm({
  next,
  brandName,
  logoUrl,
}: {
  next?: string;
  brandName?: string;
  logoUrl?: string;
}) {
  const [oauthPendingProvider, setOauthPendingProvider] = useState<SocialProvider | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (oauthPendingProvider) {
      return;
    }

    const safeNext = next && isSafeInternalPath(next) ? next : "/mypage";
    const redirectUrl = new URL("/auth/confirm", window.location.origin);
    redirectUrl.searchParams.set("next", safeNext);

    setOauthPendingProvider(provider);
    setOauthError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    if (error) {
      const providerLabel = provider === "apple" ? "Apple" : "Google";
      setOauthError(`${providerLabel} 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.`);
      setOauthPendingProvider(null);
    }
  };

  const isGooglePending = oauthPendingProvider === "google";
  const isApplePending = oauthPendingProvider === "apple";
  const isAnyPending = oauthPendingProvider !== null;

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
        <CardDescription>Google 또는 Apple 계정으로 사용자 워크스페이스에 로그인해 주세요.</CardDescription>
      </CardHeader>

      <CardContent className="px-6 pt-2 pb-6">
        {oauthError ? (
          <Alert variant="destructive" className="mb-3">
            <AlertTitle>소셜 로그인 실패</AlertTitle>
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-10 space-y-3">
          <Button
            type="button"
            className="h-14 w-full gap-3 text-base font-semibold"
            onClick={() => handleSocialLogin("google")}
            disabled={isAnyPending}
          >
            {isGooglePending ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
            {isGooglePending ? "Google 로그인 준비 중..." : "Google로 로그인"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-14 w-full gap-3 border-zinc-200 bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-50"
            onClick={() => handleSocialLogin("apple")}
            disabled={isAnyPending}
          >
            {isApplePending ? <Loader2 className="size-5 animate-spin" /> : <AppleIcon />}
            {isApplePending ? "Apple 로그인 준비 중..." : "Apple로 로그인"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">소셜 로그인만 지원합니다.</p>
      </CardContent>
    </Card>
  );
}
