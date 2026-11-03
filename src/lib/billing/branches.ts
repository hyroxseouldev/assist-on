import { billableQuantity, isBillingMemberIncluded } from "@/lib/billing/model";
import type { BillingDecision, BillingLine, BillingPreview } from "@/lib/billing/model";

type BillingBranch = "jamsil" | "dangsan" | "shared" | "other";

export type BillingBranchGroup = {
  id: BillingBranch;
  label: string;
  lines: BillingLine[];
  regularQuantity: number;
  lateJoinQuantity: number;
  lateJoinAmount: number;
  total: number;
};

const BRANCH_LABELS: Record<BillingBranch, string> = {
  jamsil: "잠실",
  dangsan: "당산",
  shared: "잠실·당산 공통",
  other: "기타·미분류",
};

export function groupBillingByBranch(
  preview: BillingPreview,
  decisions: BillingDecision[],
): BillingBranchGroup[] {
  const groups = (Object.keys(BRANCH_LABELS) as BillingBranch[]).map((id) => ({
    id,
    label: BRANCH_LABELS[id],
    lines: [] as BillingLine[],
    regularQuantity: 0,
    lateJoinQuantity: 0,
    lateJoinAmount: 0,
    total: 0,
  }));
  const byBranch = new Map(groups.map((group) => [group.id, group]));
  const byKey = new Map(decisions.map((decision) => [decision.key, decision]));
  const programTitles = new Map(
    preview.programSelection?.programs.map((program) => [program.id, program.title]),
  );

  for (const line of preview.lines) {
    // Use only this invoice's saved titles. Previous-month adjustments retain
    // their original titles instead of adopting this month's program names.
    const titles = [
      line.title,
      ...(line.source === "adjustment" ? [] : (line.programIds ?? []).map(
        (id) => programTitles.get(id) ?? "",
      )),
      ...line.members.flatMap((member) => member.programTitles),
    ];
    const jamsil = titles.some((title) => /잠실|\bjamsil\b/iu.test(title));
    const dangsan = titles.some((title) => /당산|\bdangsan\b/iu.test(title));
    const branch = jamsil && dangsan ? "shared" : jamsil ? "jamsil" : dangsan ? "dangsan" : "other";
    const group = byBranch.get(branch)!;
    const quantity = billableQuantity(line.members.filter((member) =>
      isBillingMemberIncluded(member, byKey.get(member.key)),
    ).length, line.singleMemberBilling);

    group.lines.push(line);
    // Preserve calculated/snapshotted amounts, including tenant-wide discounts.
    group.total += line.amount;
    if (line.source === "adjustment") {
      group.lateJoinQuantity += quantity;
      group.lateJoinAmount += line.amount;
    } else {
      group.regularQuantity += quantity;
    }
  }

  return groups.filter((group) =>
    group.id === "jamsil" || group.id === "dangsan" || group.lines.length > 0,
  );
}
