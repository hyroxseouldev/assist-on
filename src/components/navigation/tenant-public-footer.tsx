import Link from "next/link";

type TenantPublicFooterProps = {
  tenantSlug: string;
  brandLabel: string;
};

export function TenantPublicFooter({ tenantSlug, brandLabel }: TenantPublicFooterProps) {
  return (
    <footer className="border-t border-zinc-200/80 bg-white/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div>
              <p className="text-lg font-semibold text-zinc-950">{brandLabel}</p>
              <p className="text-sm text-zinc-600">스토어와 예약 서비스를 한 곳에서 탐색하는 테넌트 유저 진입점입니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600">
            <Link
              href={`/t/${tenantSlug}/legal/privacy`}
              className="transition-colors underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
            >
              개인정보처리방침
            </Link>
            <span aria-hidden="true" className="text-zinc-300">
              /
            </span>
            <Link
              href={`/t/${tenantSlug}/legal/terms`}
              className="transition-colors underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
            >
              이용약관
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
