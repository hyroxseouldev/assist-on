"use client";

import { Loader2 } from "lucide-react";
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
        fill="#4285F4"
      />
      <path
        d="M3.93 7.66 6.26 9.4A5.87 5.87 0 0 1 12 6.41c1.83 0 3.06.79 3.76 1.46l2.56-2.47C16.69 3.88 14.58 3 12 3 8.52 3 5.5 4.99 3.93 7.66Z"
        fill="#EA4335"
      />
      <path d="M12 21.24c2.51 0 4.62-.82 6.16-2.24l-2.85-2.34c-.76.53-1.77.9-3.31.9a5.9 5.9 0 0 1-5.57-4.07L4.09 15.3A9.12 9.12 0 0 0 12 21.24Z" fill="#34A853" />
      <path d="M21.35 11.1H12v2.84h5.36c-.11.73-.53 1.78-1.4 2.72l.01-.01 2.85 2.34c-.2.19 2.29-1.69 2.29-6.87 0-.69-.07-1.2-.16-1.95Z" fill="#FBBC05" />
    </svg>
  );
}

export function UserLoginForm({ next }: { next?: string }) {
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
    <Card className="border-zinc-200/80 bg-white">
      <CardHeader>
        <CardTitle className="text-xl">로그인</CardTitle>
        <CardDescription>Google 계정으로 로그인해 초대된 테넌트에 입장해 주세요.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {oauthError ? (
          <Alert variant="destructive">
            <AlertTitle>Google 로그인 실패</AlertTitle>
            <AlertDescription>{oauthError}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleLogin} disabled={oauthPending}>
          {oauthPending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
          {oauthPending ? "Google 로그인 준비 중..." : "Google로 로그인"}
        </Button>

        <p className="text-center text-sm text-zinc-500">이 페이지는 소셜 로그인만 지원합니다.</p>
      </CardContent>
    </Card>
  );
}
