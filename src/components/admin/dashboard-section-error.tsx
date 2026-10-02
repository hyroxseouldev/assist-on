"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardSectionError({ title }: { title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div role="alert" className="rounded-xl border bg-white p-5 text-sm">
    <p>{title} 정보를 불러오지 못했습니다.</p>
    <Button variant="outline" size="sm" className="mt-3" disabled={pending}
      onClick={() => startTransition(() => router.refresh())}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}다시 시도
    </Button>
  </div>;
}
