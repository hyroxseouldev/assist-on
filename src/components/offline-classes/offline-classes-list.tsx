"use client";

import { Clock3, Loader2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { applyOfflineClassAction, cancelOfflineClassAction } from "@/app/actions/offline-classes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import type { OfflineClassWithParticipants } from "@/lib/admin/types";

type OfflineClassesListProps = {
  classes: OfflineClassWithParticipants[];
  currentUserId: string | null;
  title: string;
  description: string;
  emptyMessage: string;
  showAllLink?: boolean;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatus(offlineClass: OfflineClassWithParticipants, currentUserId: string | null) {
  const now = Date.now();
  const startsAt = new Date(offlineClass.starts_at).getTime();
  const isClosed = now >= startsAt;
  const isRegistered =
    !!currentUserId && offlineClass.participants.some((participant) => participant.user_id === currentUserId);
  const isFull = offlineClass.participants.length >= offlineClass.capacity;

  if (isRegistered) {
    return {
      label: isClosed ? "참여 확정(시작됨)" : "신청완료",
      canApply: false,
      canCancel: !isClosed,
      tone: "secondary" as const,
    };
  }

  if (isClosed) {
    return {
      label: "신청마감",
      canApply: false,
      canCancel: false,
      tone: "secondary" as const,
    };
  }

  if (isFull) {
    return {
      label: "정원마감",
      canApply: false,
      canCancel: false,
      tone: "secondary" as const,
    };
  }

  return {
    label: "신청가능",
    canApply: true,
    canCancel: false,
    tone: "default" as const,
  };
}

export function OfflineClassesList({
  classes,
  currentUserId,
  title,
  description,
  emptyMessage,
  showAllLink = false,
}: OfflineClassesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runWithToast = (action: () => Promise<{ ok: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {showAllLink ? (
            <Link
              href="/offline-classes"
              className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
            >
              전체보기
            </Link>
          ) : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {classes.length === 0 ? (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-6">
            {classes.map((offlineClass) => {
              const status = getStatus(offlineClass, currentUserId);
              const participantCount = offlineClass.participants.length;

              return (
                <article key={offlineClass.id} className="space-y-3 border-b border-zinc-100 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight text-zinc-900">{offlineClass.title}</h3>
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <MapPin className="size-4" />
                        {offlineClass.location_text}
                      </p>
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <Clock3 className="size-4" />
                        {formatDateTime(offlineClass.starts_at)} - {formatDateTime(offlineClass.ends_at)}
                      </p>
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <Users className="size-4" />
                        {participantCount} / {offlineClass.capacity}명
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.tone}>{status.label}</Badge>
                      {status.canApply ? (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => runWithToast(() => applyOfflineClassAction(offlineClass.id))}
                        >
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                          신청하기
                        </Button>
                      ) : null}
                      {status.canCancel ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runWithToast(() => cancelOfflineClassAction(offlineClass.id))}
                        >
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                          신청 취소
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <article
                    className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(offlineClass.content_html) }}
                  />

                  <div className="space-y-2 rounded-md bg-zinc-50 p-3">
                    <p className="text-xs font-medium tracking-wide text-zinc-600">참가자 목록</p>
                    {offlineClass.participants.length === 0 ? (
                      <p className="text-sm text-zinc-500">아직 신청한 참가자가 없습니다.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {offlineClass.participants.map((participant) => (
                          <li key={participant.id} className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-sm">
                            <p className="text-zinc-800">
                              {participant.participant_name}
                              {currentUserId && participant.user_id === currentUserId ? (
                                <span className="ml-1 text-xs text-emerald-700">(나)</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-zinc-500">{formatDateTime(participant.created_at)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
