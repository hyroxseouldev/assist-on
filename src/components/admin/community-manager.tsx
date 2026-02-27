"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { reviewCommunityPostReportAction, setCommunityPostStatusAction } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { AdminCommunityPostRow, AdminCommunityReportRow, CommunityPostStatus, CommunityReportStatus } from "@/lib/admin/types";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const postStatusLabel: Record<CommunityPostStatus, string> = {
  published: "공개",
  hidden: "숨김",
  deleted: "삭제",
};

const reportStatusLabel: Record<CommunityReportStatus, string> = {
  open: "대기",
  resolved: "해결",
  rejected: "기각",
};

export function CommunityManager({ posts, reports }: { posts: AdminCommunityPostRow[]; reports: AdminCommunityReportRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const communityBasePath = `${tenantBasePath}/community`;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const postStatusFilter = searchParams.get("postStatus") ?? "all";
  const reportStatusFilter = searchParams.get("reportStatus") ?? "open";

  const setQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSetPostStatus = (postId: string, nextStatus: CommunityPostStatus) => {
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("nextStatus", nextStatus);

    startTransition(async () => {
      const result = await setCommunityPostStatusAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleReviewReport = (reportId: string, nextStatus: Exclude<CommunityReportStatus, "open">) => {
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("nextStatus", nextStatus);

    startTransition(async () => {
      const result = await reviewCommunityPostReportAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "전체" },
            { key: "published", label: "공개" },
            { key: "hidden", label: "숨김" },
            { key: "deleted", label: "삭제" },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant={postStatusFilter === tab.key ? "default" : "outline"}
              onClick={() => setQuery("postStatus", tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">게시글</th>
                <th className="px-3 py-2 text-left font-medium">작성자</th>
                <th className="px-3 py-2 text-left font-medium">반응</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">작성일</th>
                <th className="px-3 py-2 text-left font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="border-t border-zinc-100 align-top">
                    <td className="px-3 py-2">
                      <a
                        href={`${communityBasePath}/${post.id}`}
                        className="line-clamp-2 font-medium text-zinc-900 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {post.title}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{post.author_name}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600">좋아요 {post.like_count} · 댓글 {post.comment_count}</td>
                    <td className="px-3 py-2">
                      <Badge variant={post.status === "published" ? "default" : "secondary"}>{postStatusLabel[post.status]}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{formatDate(post.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {post.status !== "published" ? (
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "published")}>공개</Button>
                        ) : null}
                        {post.status !== "hidden" ? (
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "hidden")}>숨김</Button>
                        ) : null}
                        {post.status !== "deleted" ? (
                          <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "deleted")}>삭제</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "open", label: "신고 대기" },
            { key: "resolved", label: "해결" },
            { key: "rejected", label: "기각" },
            { key: "all", label: "전체" },
          ].map((tab) => (
            <Button
              key={tab.key}
              type="button"
              size="sm"
              variant={reportStatusFilter === tab.key ? "default" : "outline"}
              onClick={() => setQuery("reportStatus", tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">대상 게시글</th>
                <th className="px-3 py-2 text-left font-medium">신고자</th>
                <th className="px-3 py-2 text-left font-medium">사유</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">신고일</th>
                <th className="px-3 py-2 text-left font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    신고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-t border-zinc-100 align-top">
                    <td className="px-3 py-2">
                      <a
                        href={`${communityBasePath}/${report.post_id}`}
                        className="line-clamp-2 font-medium text-zinc-900 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {report.post_title}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{report.reporter_name}</td>
                    <td className="px-3 py-2 text-zinc-700">{report.reason}</td>
                    <td className="px-3 py-2">
                      <Badge variant={report.status === "open" ? "default" : "secondary"}>{reportStatusLabel[report.status]}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{formatDate(report.created_at)}</td>
                    <td className="px-3 py-2">
                      {report.status === "open" ? (
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReviewReport(report.id, "resolved")}>
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                            해결
                          </Button>
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReviewReport(report.id, "rejected")}>
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                            기각
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500">
                          {report.reviewed_by_name ? `${report.reviewed_by_name} · ` : ""}
                          {formatDate(report.reviewed_at)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
