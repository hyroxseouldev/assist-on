import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { OfflineClassesList } from "@/components/offline-classes/offline-classes-list";
import { Button } from "@/components/ui/button";
import { getPublishedOfflineClassById } from "@/lib/admin/server";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}): Promise<Metadata> {
  const { tenantSlug, id } = await params;
  const data = await getPublishedOfflineClassById(tenantSlug, id);

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: data?.offlineClass.title || "오프라인 클래스",
    description: data ? `${data.offlineClass.title} 클래스 상세 페이지` : "오프라인 클래스 상세 페이지",
  });
}

export default async function TenantOfflineClassDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const data = await getPublishedOfflineClassById(tenantSlug, id);

  if (!data) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/offline-classes`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <OfflineClassesList
        classes={[data.offlineClass]}
        currentUserId={data.currentUserId}
        title="오프라인 클래스 상세"
        description="클래스 안내를 확인하고 바로 신청할 수 있습니다."
        emptyMessage="등록된 오프라인 클래스가 없습니다."
      />
    </section>
  );
}
