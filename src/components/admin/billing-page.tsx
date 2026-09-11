import { BillingManager } from "@/components/admin/billing-manager";
import { getBillingData } from "@/lib/billing/server";
import { isMonth, kstDate } from "@/lib/billing/model";

export async function BillingPage({
  tenantSlug,
  month,
}: {
  tenantSlug: string;
  month?: string;
}) {
  const selectedMonth = month && isMonth(month) ? month : kstDate().slice(0, 7);
  const data = await getBillingData(tenantSlug, selectedMonth);
  return (
    <BillingManager
      key={`${selectedMonth}:${data.revision}:${JSON.stringify(data.invoices)}`}
      data={data}
    />
  );
}
