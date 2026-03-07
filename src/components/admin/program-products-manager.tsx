"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import type { AdminProgramProductRow } from "@/lib/admin/types";

type ProgramProductsManagerProps = {
  products: AdminProgramProductRow[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatSaleStatus(value: "active" | "preparing" | "private") {
  if (value === "active") return "판매중";
  if (value === "preparing") return "준비중";
  return "비공개";
}

export function ProgramProductsManager({ products }: ProgramProductsManagerProps) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const tenantSlug = tenantBasePath.split("/")[2] ?? "";
  const productsPath = `${tenantBasePath}/admin/store/products`;

  const handleCopyLink = async (productId: string) => {
    if (!tenantSlug) {
      toast.error("테넌트 정보를 찾지 못했습니다.");
      return;
    }

    await navigator.clipboard.writeText(`${window.location.origin}/store/${tenantSlug}/${productId}`);
    toast.success("상품 링크가 복사되었습니다.");
  };

  if (products.length === 0) {
    return <p className="text-sm text-zinc-500">등록된 판매 상품이 없습니다. 프로그램을 먼저 생성해 주세요.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">썸네일</th>
            <th className="px-3 py-2 text-left font-medium">프로그램</th>
            <th className="px-3 py-2 text-left font-medium">가격</th>
            <th className="px-3 py-2 text-left font-medium">유형</th>
            <th className="px-3 py-2 text-left font-medium">상태</th>
            <th className="px-3 py-2 text-left font-medium">링크</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
              onClick={() => router.push(`${productsPath}/${product.id}`)}
            >
              <td className="px-3 py-2">
                <div className="relative size-14 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                  <Image
                    src={product.thumbnail_urls[0] || "/xon_logo.jpg"}
                    alt={`${product.program_title} 썸네일`}
                    fill
                    className="object-cover"
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                <p className="font-medium text-zinc-900">{product.program_title}</p>
                <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
              </td>
              <td className="px-3 py-2 text-zinc-700">{formatCurrency(product.price_krw)}원</td>
              <td className="px-3 py-2 text-zinc-700">{product.sale_type === "subscription" ? "월 구독" : "1회 결제"}</td>
              <td className="px-3 py-2 text-zinc-700">{formatSaleStatus(product.sale_status)}</td>
              <td className="px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleCopyLink(product.id);
                  }}
                >
                  링크복사
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
