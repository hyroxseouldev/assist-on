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
        "border-t border-line/80 pt-5 text-xs text-ink-subtle",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/t/${tenantSlug}/legal/privacy`}
          className="transition-colors underline decoration-line-strong underline-offset-4 hover:text-ink-secondary"
        >
          개인정보처리방침
        </Link>
        <span aria-hidden="true" className="hidden text-line-strong sm:inline">
          /
        </span>
        <Link
          href={`/t/${tenantSlug}/legal/terms`}
          className="transition-colors underline decoration-line-strong underline-offset-4 hover:text-ink-secondary"
        >
          이용약관
        </Link>
      </div>
    </footer>
  );
}
