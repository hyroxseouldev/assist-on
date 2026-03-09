"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
    <div className="w-full space-y-3">
      {oauthError ? (
        <Alert variant="destructive">
          <AlertTitle>Google 로그인 실패</AlertTitle>
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        className="h-12 w-full gap-3 rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-[0_10px_30px_rgba(24,24,27,0.18)] transition-all hover:bg-zinc-900 hover:shadow-[0_14px_34px_rgba(24,24,27,0.22)]"
        onClick={handleGoogleLogin}
        disabled={oauthPending}
      >
        {oauthPending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        {oauthPending ? "Google 로그인 준비 중..." : "Google로 계속하기"}
      </Button>

      <p className="text-center text-xs text-zinc-500">소셜 로그인만 지원합니다.</p>
    </div>
  );
}
