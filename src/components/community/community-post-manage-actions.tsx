"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { deleteCommunityPostAction } from "@/app/actions/community";
import { Button } from "@/components/ui/button";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";

export function CommunityPostManageActions({ postId }: { postId: string }) {
  const router = useRouter();
  const tenantBasePath = useTenantBasePath();
  const communityBasePath = `${tenantBasePath}/community`;
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const shouldDelete = window.confirm("게시글을 삭제할까요?");
    if (!shouldDelete) {
      return;
    }

    const formData = new FormData();
    formData.set("postId", postId);

    startTransition(async () => {
      const result = await deleteCommunityPostAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.push(communityBasePath);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`${communityBasePath}/${postId}/edit`}>
          <Pencil className="size-4" />
          수정
        </Link>
      </Button>

      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleDelete}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        삭제
      </Button>
    </div>
  );
}
