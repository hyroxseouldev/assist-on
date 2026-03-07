import Link from "next/link";

type PublicLegalFooterProps = {
  tenantSlug: string;
  className?: string;
};

export function PublicLegalFooter({ tenantSlug, className }: PublicLegalFooterProps) {
  return (
    <footer className={className ?? "border-t border-zinc-200 pt-4 text-xs text-zinc-500"}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/t/${tenantSlug}/legal/privacy`} className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700">
          개인정보처리방침
        </Link>
        <Link href={`/t/${tenantSlug}/legal/terms`} className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700">
          이용약관
        </Link>
      </div>
    </footer>
  );
}
