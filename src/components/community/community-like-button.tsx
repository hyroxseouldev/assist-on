"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { toggleCommunityPostLikeAction } from "@/app/actions/community";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityLikeButton({
  postId,
  likedByMe,
  likeCount,
}: {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(likedByMe);
  const [count, setCount] = useState(likeCount);

  const handleToggleLike = () => {
    const optimisticLiked = !liked;
    const optimisticCount = Math.max(0, count + (optimisticLiked ? 1 : -1));

    setLiked(optimisticLiked);
    setCount(optimisticCount);

    const formData = new FormData();
    formData.set("postId", postId);

    startTransition(async () => {
      const result = await toggleCommunityPostLikeAction(formData);

      if (!result.ok) {
        setLiked(liked);
        setCount(count);
        toast.error(result.message);
        return;
      }

      if (typeof result.liked === "boolean") {
        setLiked(result.liked);
      }
      if (typeof result.likeCount === "number") {
        setCount(result.likeCount);
      }

      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      className={cn("h-8 gap-1.5 px-2 text-zinc-500 hover:bg-zinc-100", liked ? "text-rose-600" : "")}
      onClick={handleToggleLike}
    >
      <Heart className={cn("size-4", liked ? "fill-current" : "")} />
      <span className="text-xs">{count}</span>
    </Button>
  );
}
