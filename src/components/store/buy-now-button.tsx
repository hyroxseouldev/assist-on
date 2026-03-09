import Link from "next/link";

import { Button } from "@/components/ui/button";

type BuyNowButtonProps = {
  tenantSlug: string;
  productId: string;
  saleType?: "one_time" | "subscription";
  disabled?: boolean;
};

export function BuyNowButton({ tenantSlug, productId, saleType = "one_time", disabled = false }: BuyNowButtonProps) {
  const label = saleType === "subscription" ? "결제하기" : "결제하기";

  if (disabled) {
    return (
      <Button className="h-14 w-full rounded-lg text-base" disabled>
        {label}
      </Button>
    );
  }

  return (
    <Button asChild className="h-14 w-full rounded-lg text-base">
      <Link href={`/store/${tenantSlug}/${productId}/checkout`}>{label}</Link>
    </Button>
  );
}
