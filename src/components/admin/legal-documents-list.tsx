import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AdminLegalDocumentRow } from "@/lib/admin/types";

type LegalDocumentsListProps = {
  tenantSlug: string;
  documents: AdminLegalDocumentRow[];
};

const typeLabel: Record<AdminLegalDocumentRow["type"], string> = {
  terms_of_service: "이용약관",
  privacy_policy: "개인정보처리방침",
};

function formatDateTime(value: string | null) {
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

function getPublicPath(tenantSlug: string, type: AdminLegalDocumentRow["type"]) {
  if (type === "privacy_policy") {
    return `/t/${tenantSlug}/legal/privacy`;
  }

  return `/t/${tenantSlug}/legal/terms`;
}

export function LegalDocumentsList({ tenantSlug, documents }: LegalDocumentsListProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-500">등록된 약관이 없습니다.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">문서 종류</th>
            <th className="px-3 py-2 text-left font-medium">언어</th>
            <th className="px-3 py-2 text-left font-medium">제목</th>
            <th className="px-3 py-2 text-left font-medium">버전</th>
            <th className="px-3 py-2 text-left font-medium">게시 상태</th>
            <th className="px-3 py-2 text-left font-medium">게시일</th>
            <th className="px-3 py-2 text-left font-medium">수정일</th>
            <th className="px-3 py-2 text-left font-medium">공개 링크</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => {
            const publicPath = getPublicPath(tenantSlug, document.type);

            return (
              <tr key={document.id} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-800">{typeLabel[document.type]}</td>
                <td className="px-3 py-2 text-zinc-700">{document.locale.toUpperCase()}</td>
                <td className="px-3 py-2 font-medium text-zinc-900">{document.title || "-"}</td>
                <td className="px-3 py-2 text-zinc-700">{document.version}</td>
                <td className="px-3 py-2">
                  <Badge variant={document.is_published ? "default" : "secondary"}>
                    {document.is_published ? "게시" : "비공개"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-zinc-700">{formatDateTime(document.published_at)}</td>
                <td className="px-3 py-2 text-zinc-700">{formatDateTime(document.updated_at)}</td>
                <td className="px-3 py-2">
                  <Link href={publicPath} className="text-xs text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
                    {publicPath}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
