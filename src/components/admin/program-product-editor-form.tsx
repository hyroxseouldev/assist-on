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

type ProgramProductEditorFormProps = {
  tenantSlug: string;
  product: AdminProgramProductRow;
};

export function ProgramProductEditorForm({ tenantSlug, product }: ProgramProductEditorFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("id", product.id);

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

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/store/${tenantSlug}/${product.id}`);
    toast.success("상품 링크가 복사되었습니다.");
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="md:col-span-2 space-y-1">
        <p className="text-sm font-medium text-zinc-900">{product.program_title}</p>
        <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="priceKrw">가격(원)</Label>
        <Input id="priceKrw" name="priceKrw" type="number" min={1000} step={1000} defaultValue={product.price_krw} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="isActive">판매 상태</Label>
        <select
          id="isActive"
          name="isActive"
          defaultValue={product.is_active ? "true" : "false"}
          className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
        >
          <option value="true">판매중</option>
          <option value="false">비공개</option>
        </select>
      </div>

      <div className="md:col-span-2 flex gap-2">
        <Button type="button" variant="outline" onClick={() => void handleCopyLink()}>
          링크복사
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "저장 중..." : "상품 저장"}
        </Button>
      </div>
    </form>
  );
}
