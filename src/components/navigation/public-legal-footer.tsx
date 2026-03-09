import Link from "next/link";

import { cn } from "@/lib/utils";

type PublicLegalFooterProps = {
  tenantSlug: string;
  className?: string;
};

export function PublicLegalFooter({ tenantSlug, className }: PublicLegalFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-zinc-200/80 pt-5 text-xs text-zinc-500",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/t/${tenantSlug}/legal/privacy`}
          className="transition-colors underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700"
        >
          개인정보처리방침
        </Link>
        <span aria-hidden="true" className="hidden text-zinc-300 sm:inline">
          /
        </span>
        <Link
          href={`/t/${tenantSlug}/legal/terms`}
          className="transition-colors underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700"
        >
          이용약관
        </Link>
      </div>
    </footer>
  );
}
