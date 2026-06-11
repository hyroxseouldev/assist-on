"use client";

import { Clock3, Loader2, MapPin, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  showDetailLink?: boolean;
  compact?: boolean;
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
  const registrationOpensAt = offlineClass.registration_opens_at ? new Date(offlineClass.registration_opens_at).getTime() : null;
  const registrationClosesAt = new Date(offlineClass.registration_closes_at ?? offlineClass.starts_at).getTime();
  const cancellationClosesAt = new Date(offlineClass.cancellation_closes_at ?? offlineClass.starts_at).getTime();
  const myRegistration = currentUserId
    ? offlineClass.participants.find((participant) => participant.user_id === currentUserId)
    : null;
  const confirmedCount = offlineClass.participants.filter((participant) => participant.status === "confirmed").length;
  const isFull = confirmedCount >= offlineClass.capacity;
  const canCancel = now < cancellationClosesAt;

  if (myRegistration?.status === "pending") {
    return {
      label: "승인 대기",
      canApply: false,
      canCancel,
      tone: "secondary" as const,
    };
  }

  if (myRegistration?.status === "confirmed") {
    return {
      label: "참여 확정",
      canApply: false,
      canCancel,
      tone: "default" as const,
    };
  }

  if (myRegistration?.status === "rejected") {
    return {
      label: "거절됨",
      canApply: (!registrationOpensAt || now >= registrationOpensAt) && now < registrationClosesAt && !isFull,
      canCancel: false,
      tone: "destructive" as const,
    };
  }

  if (registrationOpensAt && now < registrationOpensAt) {
    return {
      label: "예약 전",
      canApply: false,
      canCancel: false,
      tone: "secondary" as const,
    };
  }

  if (now >= registrationClosesAt) {
    return {
      label: "신청마감",
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
  showDetailLink = false,
  compact = false,
}: OfflineClassesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";
  const offlineClassesPath = `${tenantBasePath}/offline-classes`;

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
              href={offlineClassesPath}
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
              const confirmedParticipants = offlineClass.participants.filter((participant) => participant.status === "confirmed");
              const pendingCount = offlineClass.participants.filter((participant) => participant.status === "pending").length;

              return (
                <article key={offlineClass.id} className="space-y-3 border-b border-zinc-100 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      {showDetailLink ? (
                        <h3 className="text-base font-semibold tracking-tight text-zinc-900">
                          <Link href={`${offlineClassesPath}/${offlineClass.id}`} className="hover:underline">
                            {offlineClass.title}
                          </Link>
                        </h3>
                      ) : (
                        <h3 className="text-base font-semibold tracking-tight text-zinc-900">{offlineClass.title}</h3>
                      )}
                      {offlineClass.subtitle ? <p className="text-sm text-zinc-600">{offlineClass.subtitle}</p> : null}
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <MapPin className="size-4" />
                        {offlineClass.location_text}
                      </p>
                      <p className="text-sm text-zinc-500">{offlineClass.address_text}</p>
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <Clock3 className="size-4" />
                        {formatDateTime(offlineClass.starts_at)} - {formatDateTime(offlineClass.ends_at)}
                      </p>
                      {offlineClass.coach_profile ? (
                        <p className="flex items-center gap-1 text-sm text-zinc-600">
                          <UserRound className="size-4" />
                          {offlineClass.coach_profile.display_name}
                        </p>
                      ) : null}
                      <p className="flex items-center gap-1 text-sm text-zinc-600">
                        <Users className="size-4" />
                        확정 {confirmedParticipants.length} / {offlineClass.capacity}명
                        {pendingCount > 0 ? <span className="text-zinc-400">· 대기 {pendingCount}명</span> : null}
                      </p>
                      <p className="text-xs text-zinc-500">
                        신청 {formatDateTime(offlineClass.registration_opens_at ?? offlineClass.starts_at)} -{" "}
                        {formatDateTime(offlineClass.registration_closes_at ?? offlineClass.starts_at)} · 취소 마감{" "}
                        {formatDateTime(offlineClass.cancellation_closes_at ?? offlineClass.starts_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status.tone}>{status.label}</Badge>
                      {status.canApply ? (
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => runWithToast(() => applyOfflineClassAction(tenantSlugMatch?.[1] ?? "", offlineClass.id))}
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
                          onClick={() => runWithToast(() => cancelOfflineClassAction(tenantSlugMatch?.[1] ?? "", offlineClass.id))}
                        >
                          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                          신청 취소
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {compact ? null : (
                    <>
                      <article
                        className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(offlineClass.content_html) }}
                      />

                      <div className="space-y-2 rounded-md bg-zinc-50 p-3">
                        <p className="text-xs font-medium tracking-wide text-zinc-600">확정 참가자 목록</p>
                        {confirmedParticipants.length === 0 ? (
                          <p className="text-sm text-zinc-500">아직 확정된 참가자가 없습니다.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {confirmedParticipants.map((participant) => (
                              <li
                                key={participant.id}
                                className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-sm"
                              >
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
                    </>
                  )}

                  {showDetailLink ? (
                    <Link
                      href={`${offlineClassesPath}/${offlineClass.id}`}
                      className="inline-flex text-xs text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
                    >
                      자세히 보기
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
