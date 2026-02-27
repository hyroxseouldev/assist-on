"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateProgramProductAction } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminProgramProductRow } from "@/lib/admin/types";

type ProgramProductsManagerProps = {
  products: AdminProgramProductRow[];
};

export function ProgramProductsManager({ products }: ProgramProductsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = (id: string, form: HTMLFormElement) => {
    const formData = new FormData(form);
    formData.set("id", id);

    startTransition(async () => {
      const result = await updateProgramProductAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  if (products.length === 0) {
    return <p className="text-sm text-zinc-500">등록된 판매 상품이 없습니다. 프로그램을 먼저 생성해 주세요.</p>;
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <form
          key={product.id}
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_180px_140px_100px]"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave(product.id, event.currentTarget);
          }}
        >
          <div>
            <p className="text-sm font-medium text-zinc-900">{product.program_title}</p>
            <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`price-${product.id}`}>가격(원)</Label>
            <Input id={`price-${product.id}`} name="priceKrw" type="number" min={1000} step={1000} defaultValue={product.price_krw} />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`active-${product.id}`}>판매 상태</Label>
            <select
              id={`active-${product.id}`}
              name="isActive"
              defaultValue={product.is_active ? "true" : "false"}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
            >
              <option value="true">판매중</option>
              <option value="false">비공개</option>
            </select>
          </div>

          <div className="self-end">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              저장
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}
