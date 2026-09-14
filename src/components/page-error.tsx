"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div role="alert" className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-xl font-semibold">화면을 불러오지 못했습니다</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        일시적인 연결 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <Button disabled={isPending} onClick={() => startTransition(() => {
        router.refresh();
        reset();
      })}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {isPending ? "불러오는 중…" : "다시 시도"}
      </Button>
      {error.digest ? <p className="text-xs text-muted-foreground">오류 번호: {error.digest}</p> : null}
    </div>
  );
}
