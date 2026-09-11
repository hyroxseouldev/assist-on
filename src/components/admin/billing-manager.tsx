"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  Loader2,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { BillingExclusionUserSearch } from "@/components/admin/billing-exclusion-user-search";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createBillingContract,
  endBillingContract,
  finalizeBilling,
  markBillingPaid,
  saveBillingSettings,
  saveBillingMemberExclusion,
  revokeBillingMemberExclusion,
} from "@/lib/billing/actions";
import {
  applyBillingDecisions,
  billableQuantity,
  isBillingMemberIncluded,
  billingWindow,
  shiftMonth,
} from "@/lib/billing/model";
import type {
  BillingDecision,
  BillingContract,
  BillingLine,
  BillingProgram,
  BillingMember,
} from "@/lib/billing/model";
import type { BillingPageData } from "@/lib/billing/server";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const card = "rounded-2xl border border-zinc-200/80 bg-white";
const selectClass =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-emerald-600";

export function BillingManager({ data }: { data: BillingPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("monthly");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<BillingProgram | null>(
    null,
  );
  const [memberLine, setMemberLine] = useState<BillingLine | null>(null);
  const [exclusionMember, setExclusionMember] = useState<Pick<BillingMember, "userId" | "name" | "programIds"> | null>(null);
  const [exclusionSearchOpen, setExclusionSearchOpen] = useState(false);
  const [exclusionScope, setExclusionScope] = useState("");
  const [exclusionReason, setExclusionReason] = useState("관계자");
  const [revokeExclusion, setRevokeExclusion] = useState<BillingPageData["memberExclusions"][number] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidOn, setPaidOn] = useState(data.today);
  const [paymentNote, setPaymentNote] = useState("");
  const [decisions, setDecisions] = useState<BillingDecision[]>([]);
  const [day, setDay] = useState(data.settings.billing_day);
  const [price, setPrice] = useState(data.settings.unit_price);
  const [endingContract, setEndingContract] = useState<BillingContract | null>(
    null,
  );
  const [lastMonth, setLastMonth] = useState(data.preview.month);
  const invoice = data.invoices.find((i) => i.month === data.preview.month);
  const preview =
    invoice?.snapshot ?? applyBillingDecisions(data.preview, decisions);
  const activeDecisions = invoice?.snapshot.decisions ?? decisions;
  const decisionMap = new Map(activeDecisions.map((d) => [d.key, d]));
  const unresolved = preview.lines
    .flatMap((l) => l.members)
    .filter(
      (m) => m.needsReview && !m.excludedByDefault && !decisionMap.has(m.key),
    ).length;
  const isCollecting = data.today < preview.dueDate;
  const daysUntil = Math.max(
    0,
    Math.ceil(
      (Date.parse(preview.dueDate) - Date.parse(data.today)) / 86400000,
    ),
  );
  const outstanding = data.invoices
    .filter((i) => !i.paid_at)
    .reduce((n, i) => n + i.amount, 0);
  const status = invoice
    ? invoice.paid_at
      ? "입금 완료"
      : "청구 확정"
    : preview.lines.length
      ? "예상 청구"
      : "청구 대상 없음";

  function run(
    action: () => Promise<{ ok: boolean; message: string }>,
    close?: () => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        close?.();
        router.refresh();
      } catch {
        toast.error("처리하지 못했습니다. 권한과 연결 상태를 확인해 주세요.");
      }
    });
  }
  function changeMonth(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    startTransition(() =>
      router.push(`${pathname}?month=${month}`, { scroll: false }),
    );
  }
  function addContract(program: BillingProgram | null = null) {
    setSelectedProgram(program);
    setContractOpen(true);
  }

  return (
    <div className="min-w-0 space-y-6 px-2 pb-8 pt-2 sm:pt-3">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-emerald-700">
            PAYMENTS / BILLING
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
            청구
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {data.tenantName}의 프로그램 이용료와 월별 정산 내역입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" />
            청구 설정
          </Button>
          {data.canManage ? (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => addContract()}
            >
              <Plus className="size-4" />
              계약 등록
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1"
          aria-label="청구월 선택"
        >
          <Button
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label="이전 청구월"
            onClick={() => changeMonth(shiftMonth(preview.month, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            aria-label="청구월"
            type="month"
            min="2000-01"
            max="2200-12"
            className="w-[155px] border-0 shadow-none"
            value={preview.month}
            disabled={pending}
            onChange={(e) => changeMonth(e.target.value)}
          />
          <Button
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label="다음 청구월"
            onClick={() => changeMonth(shiftMonth(preview.month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin text-emerald-600" />
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <ShieldCheck className="size-3.5" />
          메일 발송 · 자동 출금 미연동
        </span>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section
          className="relative overflow-hidden rounded-2xl border border-emerald-900 bg-emerald-950 p-6 text-white sm:p-7"
          aria-label="이번 달 청구 요약"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-emerald-100/80">
              {invoice ? "확정된 청구 금액" : "이번 달 예상 청구액"}
            </span>
            <Badge className="border-emerald-700/50 bg-emerald-900 text-emerald-100">
              {status}
            </Badge>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
            <p className="min-w-0 break-all text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
              {preview.total.toLocaleString("ko-KR")}
              <span className="ml-2 text-xl font-normal text-emerald-100/70">
                원
              </span>
            </p>
            <div className="border-l border-emerald-100/20 pl-6">
              <p className="text-xs text-emerald-100/80">이번 달 청구 인원</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                {(preview.regularQuantity ?? preview.quantity).toLocaleString("ko-KR")}
                <span className="ml-1.5 text-base font-normal text-emerald-100/70">명</span>
              </p>
            </div>
          </div>
          {(preview.lateJoinQuantity ?? 0) > 0 ? (
            <p className="mt-4 text-xs text-emerald-100/80">
              지난 이용월 중간 합류 {preview.lateJoinQuantity}명분 · {won(preview.lateJoinAmount ?? 0)} 추가 포함
            </p>
          ) : null}
          {preview.volumeDiscount ? (
            <p className="mt-4 text-sm text-emerald-100">
              {preview.volumeDiscount.applied
                ? `${preview.volumeDiscount.minimumQuantity}명 이상 할인 적용 · 1인 ${won(preview.volumeDiscount.unitPrice)}`
                : `${preview.volumeDiscount.minimumQuantity}명부터 전체 인원 1인 ${won(preview.volumeDiscount.unitPrice)}`}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-emerald-100/80">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              청구 인원은 항목별 합산 기준
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ReceiptText className="size-3.5" />
              {preview.lines.length}개 청구 항목
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-emerald-100/70">
              {preview.periodStart} ~ {preview.periodEnd} 이용분
            </p>
            <span className="text-xs font-medium text-emerald-100">
              중간 합류도 1인당 월 전액
            </span>
          </div>
        </section>
        <section
          className={`${card} flex flex-col justify-between p-6`}
          aria-label="청구 일정"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CalendarDays className="size-5" />
            </span>
            <Badge variant="outline" className="font-normal">
              {invoice
                ? "내역 보존 중"
                : isCollecting
                  ? `D-${daysUntil}`
                  : "확정 가능일 도래"}
            </Badge>
          </div>
          <div className="mt-5">
            <p className="text-xs text-zinc-500">선택한 월 청구일</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {Number(preview.dueDate.slice(5, 7))}월{" "}
              {Number(preview.dueDate.slice(8))}일
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              매월 {data.settings.billing_day}일 · 해당 일이 없는 달은 말일
              <br />
              참여자 증감은 확정 전 산정에 반영됩니다.
            </p>
          </div>
          {invoice ? (
            <p className="mt-4 text-xs text-emerald-700">
              <Check className="mr-1 inline size-3.5" />
              확정 당시 명단과 금액을 보존합니다.
            </p>
          ) : (
            <p className="mt-4 text-xs text-zinc-500">
              청구일 이후 관리자 확인을 거쳐 확정합니다.
            </p>
          )}
        </section>
      </div>

      {preview.programSelection ? (
        <section className={`${card} p-5`} aria-label="청구 산정 기준">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{preview.billingTiming === "advance" ? "선불 청구 · " : ""}후기 있는 프로그램 · 전체 등록 인원 기준</h2>
            <Badge variant="outline">
              대상 프로그램 {preview.programSelection.programs.length}개
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-6 text-zinc-500">
            프로그램 선정: {preview.programSelection.month}월 1일~말일(한국시간)에
            운동 후기가 1건 이상 등록된 프로그램. 공개 여부와 코치 답변 여부는 관계없습니다.
            <br />
            인원 산정: {preview.periodStart} ~ {preview.periodEnd} 이용권 보유 회원
            전체 × 계약 단가. 후기를 안 쓴 회원도 포함하며, 운영 계정은 기본 제외합니다.
            계약 없이도 기본 단가로 합산하며, 계약이 있는 프로그램은 계약 조건을 우선합니다.
            청구 제외 설정된 프로그램은 합산하지 않습니다.
            ‘○○님 전용 하이록스 프로그램’은 등록 인원과 관계없이 최대 1명분만 청구합니다.
            {preview.volumeDiscount ? <><br />이번 달 청구 인원이 {preview.volumeDiscount.minimumQuantity}명 이상이면 전체 인원에 {won(preview.volumeDiscount.unitPrice)} 할인 단가를 적용합니다.
              더 낮은 별도 계약 단가는 유지하며, 이전 월 중간 합류 추가분은 당시 확정 단가로 계산합니다.</> : null}
            {preview.billingTiming === "advance" ? (
              <><br />청구일 {preview.dueDate}에 시작하는 이용 기간의 선불 예상액입니다.
              같은 청구 계약 안의 런·스테이션 이동 회원은 한 번만 합산합니다.</>
            ) : null}
          </p>
          {!invoice ? (
            <Link
              href={`${pathname.replace(/\/billing$/, "")}/analytics/monthly?month=${preview.programSelection.month}`}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline underline-offset-4"
            >
              같은 달 월별 분석 확인 <ArrowRight className="size-3" />
            </Link>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">프로그램 선정 근거도 확정 당시 기준으로 보존됩니다.</p>
          )}
        </section>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="gap-5">
        <TabsList className="h-10 bg-zinc-100/80 p-1">
          <TabsTrigger value="monthly">월별 청구</TabsTrigger>
          <TabsTrigger value="contracts">
            계약 관리{" "}
            <span className="ml-1 text-xs text-zinc-400">
              {data.contracts.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history">청구 내역</TabsTrigger>
          <TabsTrigger value="exclusions">청구 제외</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="space-y-5">
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5">
              <div>
                <h2 className="font-semibold">프로젝트별 이용료</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  자동 감지된 프로그램은 기본 단가로 계산합니다. 같은 계약으로 묶인
                  프로그램은 회원 한 명당 한 번만 계산합니다.
                </p>
              </div>
              <Badge variant="outline">{preview.lines.length}개 항목</Badge>
            </div>
            {preview.lines.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">프로그램 / 계약</th>
                      <th className="px-4 py-3 font-medium">회차</th>
                      <th className="px-4 py-3 text-right font-medium">
                        인원 / 단가
                      </th>
                      <th className="px-5 py-3 text-right font-medium">금액</th>
                      <th className="w-16">
                        <span className="sr-only">상세</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {preview.lines.map((line) => (
                      <tr key={line.contractId} className="hover:bg-zinc-50/60">
                        <td className="max-w-[270px] px-5 py-5">
                          <p className="font-medium text-zinc-900">
                            {line.title}
                          </p>
                          <Badge variant="outline" className="mt-2 text-[10px]">
                            {line.source === "adjustment" ? `${line.serviceMonth} 중간 합류` : line.source === "program" ? "자동 산정" : "계약 기준"}
                          </Badge>
                          {(line.programIds?.length ?? 0) > 1 ? (
                            <Badge variant="outline" className="ml-1 mt-2 text-[10px] text-emerald-700">프로그램 통합 · 중복 제외</Badge>
                          ) : null}
                          {line.singleMemberBilling ? (
                            <Badge variant="outline" className="ml-1 mt-2 text-[10px] text-emerald-700">1인 청구</Badge>
                          ) : null}
                          <p className="mt-1 text-xs text-zinc-500">
                            {
                              line.members.filter(
                                (m) =>
                                  m.joinedOn > preview.periodStart &&
                                  !(
                                    decisionMap.get(m.key)?.include === false
                                  ) &&
                                  !m.excludedByDefault,
                              ).length
                            }
                            명 기간 중 합류
                          </p>
                        </td>
                        <td className="px-4 py-5 text-xs text-zinc-500">
                          {line.source === "adjustment"
                            ? "다음 달 추가 청구"
                            : line.source === "program"
                            ? "후기 조건 충족 월"
                            : line.totalInstallments
                            ? `${line.installment} / ${line.totalInstallments}회`
                            : "매월 반복"}
                        </td>
                        <td className="px-4 py-5 text-right tabular-nums">
                          <p>
                            {
                              billableQuantity(line.members.filter(
                                (m) =>
                                  isBillingMemberIncluded(m, decisionMap.get(m.key)),
                              ).length, line.singleMemberBilling)
                            }
                            명
                          </p>
                          {line.singleMemberBilling ? (
                            <p className="mt-1 text-xs text-zinc-500">등록 {line.members.length}명 · 청구 최대 1명</p>
                          ) : null}
                          <p className="mt-1 text-xs text-zinc-500">
                            × {won(line.unitPrice)}
                          </p>
                          {line.source !== "adjustment" && (line.baseUnitPrice ?? line.unitPrice) > line.unitPrice ? (
                            <p className="mt-1 text-xs text-emerald-700">{won(line.baseUnitPrice!)} → 인원 할인</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-5 text-right font-semibold tabular-nums">
                          {won(line.amount)}
                        </td>
                        <td className="pr-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`${line.title} 참여자 상세`}
                            onClick={() => setMemberLine(line)}
                          >
                            <ArrowRight className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50/80">
                      <td colSpan={2} className="px-5 py-4 font-medium">
                        합계{" "}
                        <span className="ml-2 text-xs font-normal text-zinc-500">
                          기본 단가 / 계약 단가 기준
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-800">
                        <span className="block text-xs font-normal text-zinc-500">이번 달 청구 인원</span>
                        {(preview.regularQuantity ?? preview.quantity).toLocaleString("ko-KR")}명
                        {(preview.lateJoinQuantity ?? 0) > 0 ? <span className="block text-xs font-normal text-zinc-500">이전 월 추가 {preview.lateJoinQuantity}명분</span> : null}
                      </td>
                      <td className="px-5 py-4 text-right text-lg font-semibold tabular-nums text-emerald-800">
                        {won(preview.total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center px-5 py-12 text-center">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                  <ReceiptText className="size-6" />
                </span>
                <h3 className="font-medium">
                  이번 달 조건에 맞는 청구 대상이 없어요
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  선택한 월에 후기가 있는 프로그램의 전체 등록 인원으로 예상 이용료를
                  자동 계산합니다. 청구 제외 설정과 기존 계약 기간도 반영합니다.
                  <br />
                  예상 이용료는 청구서를 확정하기 전까지 발행되지 않습니다.
                </p>
                {data.canManage ? (
                  <Button
                    className="mt-5"
                    variant="outline"
                    onClick={() => addContract()}
                  >
                    <Plus className="size-4" />계약 등록
                  </Button>
                ) : null}
              </div>
            )}
          </section>
          {preview.billingTiming === "advance" ? (
            <section className={`${card} p-5`} aria-label="중간 합류 보고">
              <h2 className="font-semibold">중간 합류</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                이전 선불 청구서 확정 후 새로 확인된 참여자의 전액 이용료를 다음 청구에 합산합니다.
                이번 달 정규 인원과는 별도로 표시하며, 이미 청구한 회원과 이동 중복은 다시 청구하지 않습니다.
              </p>
              {preview.lines.some((line) => line.source === "adjustment") ? (
                <div className="mt-4 space-y-3">
                  {preview.lines.filter((line) => line.source === "adjustment").map((line) => (
                    <div key={line.contractId} className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex flex-wrap justify-between gap-2 text-sm font-medium">
                        <p>{line.serviceMonth} 이용분 · {line.title}</p><p>{won(line.amount)}</p>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                        {line.members.map((member) => (
                          <li key={member.key}>{member.name} · 참여일 {member.joinedOn}
                            {!isBillingMemberIncluded(member, decisionMap.get(member.key)) ? " · 이번 추가 청구 제외" : ""}
                          </li>
                        ))}
                      </ul>
                      {line.singleMemberBilling ? <p className="mt-2 text-xs text-zinc-500">1인 프로그램은 기존 청구를 포함해 최대 1명분입니다.</p> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm text-zinc-500">이번 청구에 추가할 중간 합류 인원이 없습니다.</p>}
            </section>
          ) : null}
          {unresolved && !invoice ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              과거 종료 시점을 확인해야 하는 회원이 {unresolved}명 있습니다.
              참여자 상세에서 포함/제외와 사유를 정한 뒤 확정해 주세요.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="max-w-xl text-xs leading-5 text-zinc-500">
              <CircleHelp className="mr-1 inline size-3.5" />
              {invoice
                ? "이 화면은 확정된 산정 내역입니다. 현재 프로그램 정보가 달라져도 금액은 변하지 않습니다."
                : "예상액은 화면을 새로고침하면 다시 계산합니다. 미가입 사전등록자는 포함하지 않으며, 운영 계정은 기본 제외됩니다. 세금계산서 발행은 별도입니다."}
            </p>
            {data.canManage ? (
              invoice ? (
                !invoice.paid_at ? (
                  <Button variant="outline" onClick={() => setPaidOpen(true)}>
                    <Wallet className="size-4" />
                    입금 확인
                  </Button>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-800">
                    전액 입금 완료
                  </Badge>
                )
              ) : (
                <Button
                  disabled={
                    pending ||
                    isCollecting ||
                    !preview.lines.length ||
                    unresolved > 0
                  }
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => setConfirmOpen(true)}
                >
                  <FileCheck2 className="size-4" />
                  {isCollecting
                    ? `${Number(preview.dueDate.slice(5, 7))}/${Number(preview.dueDate.slice(8))}부터 확정 가능`
                    : "청구서 확정"}
                </Button>
              )
            ) : null}
          </div>
        </TabsContent>
        <TabsContent value="contracts" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">청구 계약</h2>
              <p className="mt-1 text-xs text-zinc-500">
                운영 프로그램과 청구 기간은 별도로 관리합니다. 등록한 단가는
                계약에 보존됩니다.
              </p>
            </div>
            {data.canManage ? (
              <Button variant="outline" onClick={() => addContract()}>
                <Plus className="size-4" />
                계약 등록
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.contracts.map((contract) => (
              <article key={contract.id} className={`${card} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{contract.title}</h3>
                  <Badge variant="outline" className="shrink-0">
                    {contract.last_month ? "기간제" : "지속형"}
                  </Badge>
                </div>
                <p className="mt-4 text-2xl font-semibold">
                  {won(contract.unit_price)}
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    / 인 · 월
                  </span>
                </p>
                <dl className="mt-5 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">청구 기간</dt>
                    <dd>
                      {contract.first_month} ~{" "}
                      {contract.last_month ?? "매월 반복"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">이용 산정 시작</dt>
                    <dd>{contract.starts_on}</dd>
                  </div>
                </dl>
                <div className="mt-4 space-y-1 border-t border-zinc-100 pt-3">
                  {contract.program_ids.map((id) => (
                    <p key={id} className="text-xs leading-5 text-zinc-500">
                      {data.programs.find((p) => p.id === id)?.title ??
                        "삭제된 프로그램"}
                    </p>
                  ))}
                </div>
                {data.canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setEndingContract(contract);
                      setLastMonth(
                        contract.last_month ??
                          (data.preview.month < contract.first_month
                            ? contract.first_month
                            : data.preview.month),
                      );
                    }}
                  >
                    마지막 청구월 설정
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
          <ProgramSuggestions
            data={data}
            onAdd={data.canManage ? addContract : undefined}
          />
        </TabsContent>
        <TabsContent value="history" className="space-y-5">
          <div className={`${card} flex items-center gap-4 p-5`}>
            <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <Wallet className="size-5" />
            </span>
            <div>
              <p className="text-xs text-zinc-500">확정 청구 중 미입금</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {won(outstanding)}
              </p>
            </div>
          </div>
          <section className={card}>
            <h2 className="border-b border-zinc-100 px-5 py-4 font-semibold">
              월별 청구서
            </h2>
            {data.invoices.length ? (
              <div className="divide-y divide-zinc-100">
                {data.invoices.map((i) => (
                  <button
                    key={i.id}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-5 text-left hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                    onClick={() => {
                      setTab("monthly");
                      changeMonth(i.month);
                    }}
                  >
                    <div>
                      <p className="font-medium">{i.month} 청구서</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {i.snapshot.periodStart} ~ {i.snapshot.periodEnd}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={
                          i.paid_at ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {i.paid_at ? "입금 완료" : "입금 대기"}
                      </Badge>
                      <span className="font-semibold tabular-nums">
                        {won(i.amount)}
                      </span>
                      <ArrowRight className="size-4 text-zinc-400" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-zinc-500">
                아직 확정한 청구서가 없습니다. 예상액은 월별 청구에서 확인할 수
                있어요.
              </p>
            )}
          </section>
        </TabsContent>
        <TabsContent value="exclusions" className="space-y-4">
          <section className={card}>
            <div className="border-b border-zinc-100 p-5">
              <h2 className="font-semibold">계속 적용할 청구 제외</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                전체 회원을 검색해 직접 등록하거나 월별 청구의 참여자 상세에서 등록할 수 있습니다. 현재 미확정 청구와 다음 달에도 유지되며,
                이용 권한과 확정 청구서는 바뀌지 않습니다. 제외 해제 후에도 다른 제외 설정이 있으면 유지됩니다.
              </p>
              {!data.canManage ? <p className="mt-2 text-xs text-zinc-500">등록·해제는 플랫폼 관리자만 가능합니다.</p> : null}
              {data.canManage ? (
                <Button className="mt-4" disabled={pending} onClick={() => setExclusionSearchOpen(true)}>
                  <Plus className="size-4" />회원 검색하여 제외 추가
                </Button>
              ) : null}
            </div>
            {data.memberExclusions.length ? (
              <div className="divide-y divide-zinc-100">
                {data.memberExclusions.map((exclusion) => (
                  <div key={exclusion.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{exclusion.userName}</p>
                      <p className="mt-1 text-xs text-zinc-500">{exclusion.programTitle} · {exclusion.reason}</p>
                      <p className="mt-1 text-xs text-zinc-400">최근 변경 {new Date(exclusion.updated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                    </div>
                    {data.canManage ? (
                      <Button variant="outline" size="sm" disabled={pending} onClick={() => setRevokeExclusion(exclusion)}>
                        제외 해제
                      </Button>
                    ) : <Badge variant="outline">계속 제외</Badge>}
                  </div>
                ))}
              </div>
            ) : <p className="p-8 text-center text-sm text-zinc-500">저장된 관계자 청구 제외가 없습니다.</p>}
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>청구 설정</DialogTitle>
            <DialogDescription>
              고객사별 월 청구 기준입니다. 일할 계산은 하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  saveBillingSettings(data.tenantSlug, {
                    billing_day: day,
                    unit_price: price,
                  }),
                () => setSettingsOpen(false),
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="billing-day">매월 청구일</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="billing-day"
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  disabled={
                    !data.canManage || data.contracts.length > 0 || data.invoices.length > 0 || pending
                  }
                />
                <span className="text-sm">일</span>
              </div>
              <p className="text-xs leading-5 text-zinc-500">
                해당 일이 없는 달은 말일. 계약 등록 또는 청구 확정 후에는 기간 중복을 막기 위해
                청구일을 고정합니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-price">
                자동 산정 / 신규 계약 기본 단가 (원 / 인 · 월)
              </Label>
              <Input
                id="billing-price"
                type="number"
                min={0}
                max={10000000}
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                disabled={!data.canManage || pending}
              />
              <p className="text-xs text-zinc-500">
                기존 계약과 확정 청구서에는 영향을 주지 않습니다.
                <br />이번 달 청구 인원 51명 이상이면 6,500원 할인 단가가 적용됩니다. 더 낮은 단가는 유지됩니다.
              </p>
            </div>
            {data.settings.excluded_program_ids.length > 0 ? (
              <div className="rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-600">
                <p className="font-medium">청구 제외 프로그램</p>
                <ul className="mt-1 list-inside list-disc">
                  {data.settings.excluded_program_ids.map((id) => (
                    <li key={id}>{data.programs.find((program) => program.id === id)?.title ?? "삭제된 프로그램"}</li>
                  ))}
                </ul>
                <p className="mt-1">운동 기록은 유지되며 예상 청구에는 포함하지 않습니다.</p>
              </div>
            ) : null}
            {(data.preview.singleMemberProgramIds?.length ?? 0) > 0 ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                <p className="font-medium">1인 청구 프로그램</p>
                <ul className="mt-1 list-inside list-disc">
                  {data.preview.singleMemberProgramIds?.map((id) => (
                    <li key={id}>{data.programs.find((program) => program.id === id)?.title ?? "삭제된 프로그램"}</li>
                  ))}
                </ul>
                <p className="mt-1">‘○○님 전용 하이록스 프로그램’은 자동으로 1인 청구합니다. 별도 지정한 프로그램도 포함하며 이용 권한은 바뀌지 않습니다.</p>
              </div>
            ) : null}
            <DialogFooter>
              {data.canManage ? (
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  설정 저장
                </Button>
              ) : (
                <p className="text-xs text-zinc-500">
                  변경은 플랫폼 관리자에게 문의해 주세요.
                </p>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ContractDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        data={data}
        selectedProgram={selectedProgram}
      />

      <Dialog
        open={!!endingContract}
        onOpenChange={(open) => {
          if (!open) setEndingContract(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계약 종료 일정</DialogTitle>
            <DialogDescription>
              {endingContract?.title} · 선택한 월까지 청구하고 이후에는
              제외합니다. 프로그램 이용 권한은 변경하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (endingContract)
                run(
                  () =>
                    endBillingContract(data.tenantSlug, {
                      id: endingContract.id,
                      lastMonth,
                    }),
                  () => setEndingContract(null),
                );
            }}
          >
            <Label htmlFor="billing-last-month">마지막 청구월</Label>
            <Input
              id="billing-last-month"
              type="month"
              required
              min={endingContract?.first_month}
              max={endingContract?.last_month ?? undefined}
              value={lastMonth}
              onChange={(e) => setLastMonth(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              이미 확정한 청구서는 변경되지 않습니다. 종료월은 앞당기기만
              가능하며 연장은 새 계약으로 등록합니다.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                종료월 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!memberLine}
        onOpenChange={(open) => {
          if (!open) setMemberLine(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{memberLine?.title}</DialogTitle>
            <DialogDescription>
              {memberLine?.singleMemberBilling
                ? `등록 ${memberLine.members.length}명의 명단을 보존하되, 청구는 최대 1명분으로 계산합니다. 아래 포함 여부는 이용 이력 검토용이며 인원별로 추가 과금하지 않습니다.`
                : "동일 계약 내 중복 이용권은 한 명으로 계산합니다. 운영 계정은 기본 제외됩니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {memberLine?.members.map((member) => {
              const decision = decisionMap.get(member.key);
              return (
                <div
                  key={member.key}
                  className="rounded-lg border border-zinc-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{member.name}</p>
                    <div className="flex gap-1">
                      {member.needsReview ? (
                        <Badge variant="outline" className="text-amber-700">
                          과거 기간 확인 필요
                        </Badge>
                      ) : null}
                      {member.excludedByDefault && !member.lockedExclusion ? (
                        <Badge variant="outline">운영 계정</Badge>
                      ) : null}
                      {member.lockedExclusion ? <Badge variant="outline" className="text-amber-700">계속 청구 제외</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    이용 시작 {member.joinedOn} ·{" "}
                    {member.programTitles.join(" / ")}
                  </p>
                  {member.persistentExclusions?.map((exclusion) => (
                    <p key={exclusion.id} className="mt-2 text-xs text-amber-700">
                      {exclusion.program_id ? data.programs.find((p) => p.id === exclusion.program_id)?.title ?? "프로그램" : "고객사 전체"}
                      {" "}청구 제외 · {exclusion.reason}
                    </p>
                  ))}
                  {data.canManage && !invoice && !member.lockedExclusion ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr]">
                      <select
                        aria-label={`${member.name} 청구 포함 여부`}
                        className={selectClass}
                        value={
                          decision
                            ? decision.include
                              ? "include"
                              : "exclude"
                            : "default"
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setDecisions((old) => [
                            ...old.filter((d) => d.key !== member.key),
                            ...(value === "default"
                              ? []
                              : [
                                  {
                                    key: member.key,
                                    include: value === "include",
                                    reason:
                                      decision?.reason || "관리자 명단 확인",
                                  },
                                ]),
                          ]);
                        }}
                      >
                        <option value="default">
                          {member.excludedByDefault
                            ? "기본: 제외"
                            : member.needsReview
                              ? "포함 여부 확인"
                              : "기본: 포함"}
                        </option>
                        <option value="include">청구 포함</option>
                        <option value="exclude">청구 제외</option>
                      </select>
                      {decision ? (
                        <Input
                          aria-label={`${member.name} 조정 사유`}
                          placeholder="조정 사유"
                          value={decision.reason}
                          maxLength={300}
                          onChange={(e) =>
                            setDecisions((old) =>
                              old.map((d) =>
                                d.key === member.key
                                  ? { ...d, reason: e.target.value }
                                  : d,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-emerald-700">
                      {isBillingMemberIncluded(member, decision)
                        ? "청구 포함"
                        : "청구 제외"}
                      {decision ? ` · ${decision.reason}` : ""}
                    </p>
                  )}
                  {data.canManage && !invoice && (member.programIds?.length ?? 0) > 0 ? (
                    <Button variant="outline" size="sm" className="mt-3" disabled={pending}
                      onClick={() => {
                        setExclusionMember(member);
                        setExclusionScope(member.programIds![0]);
                        setExclusionReason("관계자");
                      }}>
                      다음 달에도 청구 제외
                    </Button>
                  ) : null}
                  {!invoice && (member.persistentExclusions?.length ?? 0) > 0 ? (
                    <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setMemberLine(null); setTab("exclusions"); }}>
                      제외 설정 관리
                    </Button>
                  ) : null}
                </div>
              );
            })}
            {memberLine?.members.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                해당 기간의 참여자가 없습니다.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberLine(null)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exclusionSearchOpen ? (
        <BillingExclusionUserSearch tenantSlug={data.tenantSlug} onClose={() => setExclusionSearchOpen(false)}
          onSelect={(user) => {
            setExclusionSearchOpen(false);
            setExclusionMember({ userId: user.userId, name: user.name, programIds: data.programs.map((program) => program.id) });
            setExclusionScope("tenant");
            setExclusionReason("관계자");
          }} />
      ) : null}

      <Dialog open={!!exclusionMember} onOpenChange={(open) => { if (!open && !pending) setExclusionMember(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{exclusionMember?.name}님 청구 제외</DialogTitle>
            <DialogDescription>
              저장하면 미확정 청구와 다음 달부터 계속 적용됩니다. 이용 권한·운동 기록과 이미 확정한 청구서는 그대로 유지됩니다.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (!exclusionMember) return;
            run(() => saveBillingMemberExclusion(data.tenantSlug, {
              userId: exclusionMember.userId,
              programId: exclusionScope === "tenant" ? null : exclusionScope,
              reason: exclusionReason,
            }), () => { setExclusionMember(null); setMemberLine(null); });
          }}>
            <div className="space-y-2">
              <Label htmlFor="billing-exclusion-scope">적용 범위</Label>
              <select id="billing-exclusion-scope" className={selectClass} value={exclusionScope}
                disabled={pending} onChange={(event) => setExclusionScope(event.target.value)}>
                {exclusionMember?.programIds?.map((id) => (
                  <option key={id} value={id}>{data.programs.find((p) => p.id === id)?.title ?? "프로그램"}만</option>
                ))}
                <option value="tenant">이 고객사의 모든 프로그램</option>
              </select>
              {exclusionScope === "tenant" ? <p className="text-xs text-amber-700">앞으로 새로 참여하는 프로그램에서도 제외됩니다.</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-exclusion-reason">제외 사유</Label>
              <Input id="billing-exclusion-reason" value={exclusionReason} maxLength={300} required
                placeholder="관계자 / 테스트 계정 / 무료 제공 등" disabled={pending}
                onChange={(event) => setExclusionReason(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={pending} onClick={() => setExclusionMember(null)}>취소</Button>
              <Button type="submit" disabled={pending || !exclusionReason.trim() || !exclusionScope}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}제외 저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeExclusion} onOpenChange={(open) => { if (!open && !pending) setRevokeExclusion(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>청구 제외를 해제할까요?</DialogTitle>
            <DialogDescription>
              {revokeExclusion?.userName} · {revokeExclusion?.programTitle}. 다른 제외 조건이 없다면 미확정 청구부터 다시 포함됩니다. 확정 청구서는 바뀌지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setRevokeExclusion(null)}>취소</Button>
            <Button disabled={pending} onClick={() => {
              if (revokeExclusion) run(() => revokeBillingMemberExclusion(data.tenantSlug, { id: revokeExclusion.id }), () => setRevokeExclusion(null));
            }}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}제외 해제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{preview.month} 청구서를 확정할까요?</DialogTitle>
            <DialogDescription>
              확정 후 인원·단가·금액을 수정할 수 없습니다. 자동 출금이나 메일
              발송은 하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-zinc-50 p-5">
            <p className="text-sm text-zinc-500">
              {preview.lines.length}개 청구 항목 · 이번 달 {preview.regularQuantity ?? preview.quantity}명
              {(preview.lateJoinQuantity ?? 0) > 0 ? ` · 이전 월 추가 ${preview.lateJoinQuantity}명분` : ""}
            </p>
            <p className="mt-2 text-3xl font-semibold">{won(preview.total)}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    finalizeBilling(data.tenantSlug, {
                      month: preview.month,
                      revision: data.revision,
                      decisions,
                    }),
                  () => setConfirmOpen(false),
                )
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              확정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전액 입금 확인</DialogTitle>
            <DialogDescription>
              실제 계좌 입금을 확인한 후 기록해 주세요. 이 버튼은 결제를
              실행하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (invoice)
                run(
                  () =>
                    markBillingPaid(data.tenantSlug, {
                      id: invoice.id,
                      paidOn,
                      note: paymentNote,
                    }),
                  () => setPaidOpen(false),
                );
            }}
          >
            <p className="text-2xl font-semibold">{won(preview.total)}</p>
            <div className="space-y-2">
              <Label htmlFor="billing-paid-date">입금일</Label>
              <Input
                id="billing-paid-date"
                type="date"
                required
                value={paidOn}
                max={data.today}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-paid-note">입금 확인 메모</Label>
              <Input
                id="billing-paid-note"
                required
                maxLength={500}
                placeholder="입금자명 / 확인 내용"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                전액 입금 기록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramSuggestions({
  data,
  onAdd,
}: {
  data: BillingPageData;
  onAdd?: (program: BillingProgram) => void;
}) {
  const suggestions = data.suggestions;
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ArrowDownRight className="size-4 text-emerald-700" />
          계약 없이 자동 산정 중인 프로그램
        </h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {data.preview.programSelection?.month}월 후기가 있는 프로그램입니다.
          인원은 {data.preview.periodStart} ~ {data.preview.periodEnd} 이용권 보유 기준이며,
          아래 금액은 이미 예상 청구 합계에 포함되어 있습니다. 별도 조건이 필요할 때만 계약에 연결하세요.
        </p>
      </div>
      <div className="divide-y divide-zinc-100">
        {suggestions.map((s) => {
          const program = data.programs.find((p) => p.id === s.programId)!;
          return (
            <div
              key={s.programId}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{program.title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  후기 {s.reviewCount}건 · 전체 등록 {s.count}명 · {won(s.amount)} / 월 · 인원 검토 필요
                </p>
              </div>
              {onAdd ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdd(program)}
                >
                  계약 연결
                  <Plus className="size-3.5" />
                </Button>
              ) : null}
            </div>
          );
        })}
        {!suggestions.length ? (
          <p className="px-5 pb-6 text-sm text-zinc-500">
            선택한 월에 후기가 있는 미연결 프로그램이 없습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ContractDialog({
  open,
  onOpenChange,
  data,
  selectedProgram,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BillingPageData;
  selectedProgram: BillingProgram | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>청구 계약 등록</DialogTitle>
          <DialogDescription>
            한 계약에 여러 프로그램을 연결하면 참여자를 합쳐 중복 없이
            계산합니다.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <ContractForm
            key={selectedProgram?.id ?? "new"}
            data={data}
            selectedProgram={selectedProgram}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ContractForm({
  data,
  selectedProgram,
  onDone,
}: {
  data: BillingPageData;
  selectedProgram: BillingProgram | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ids, setIds] = useState<string[]>(
    selectedProgram ? [selectedProgram.id] : [],
  );
  const [title, setTitle] = useState(selectedProgram?.title ?? "");
  const [startsOn, setStartsOn] = useState(
    selectedProgram?.start_date ?? data.today,
  );
  const [price, setPrice] = useState(data.settings.unit_price);
  const initialMonth = (selectedProgram?.start_date ?? data.today).slice(0, 7);
  const initialDue = billingWindow(
    initialMonth,
    data.settings.billing_day,
  ).dueDate;
  const [firstMonth, setFirstMonth] = useState(
    (selectedProgram?.start_date ?? data.today) < initialDue
      ? initialMonth
      : shiftMonth(initialMonth, 1),
  );
  const [mode, setMode] = useState("fixed");
  const [cycles, setCycles] = useState(3);
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(firstMonth);
  const lastMonth =
    mode === "fixed" && validMonth && cycles >= 1 && cycles <= 36
      ? shiftMonth(firstMonth, cycles - 1)
      : null;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            const result = await createBillingContract(data.tenantSlug, {
              title,
              program_ids: ids,
              unit_price: price,
              starts_on: startsOn,
              first_month: firstMonth,
              last_month: lastMonth,
            });
            if (!result.ok) {
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
            onDone();
            router.refresh();
          } catch {
            toast.error(
              "계약을 등록하지 못했습니다. 접근 권한과 연결을 확인해 주세요.",
            );
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="billing-contract-title">계약 이름</Label>
        <Input
          id="billing-contract-title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 잠실 12주 프로젝트"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">
          연결 프로그램 · {ids.length}개 선택
        </legend>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
          {data.programs.map((p) => (
            <Label
              key={p.id}
              className="flex cursor-pointer items-start gap-2 text-xs font-normal leading-5"
            >
              <Checkbox
                checked={ids.includes(p.id)}
                onCheckedChange={(checked) =>
                  setIds((old) =>
                    checked ? [...old, p.id] : old.filter((id) => id !== p.id),
                  )
                }
                className="mt-0.5"
              />
              <span>{p.title}</span>
            </Label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          런·스테이션처럼 같은 프로젝트의 프로그램을 함께 선택하세요.
        </p>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="billing-contract-start">이용 산정 시작일</Label>
          <Input
            id="billing-contract-start"
            type="date"
            required
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-contract-month">첫 청구월</Label>
          <Input
            id="billing-contract-month"
            type="month"
            required
            min="2000-01"
            max="2200-12"
            value={firstMonth}
            onChange={(e) => setFirstMonth(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="billing-contract-mode">청구 방식</Label>
          <select
            id="billing-contract-mode"
            className={selectClass}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="fixed">기간제 · 횟수 지정</option>
            <option value="recurring">지속형 · 매월 반복</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-contract-cycles">청구 횟수</Label>
          <Input
            id="billing-contract-cycles"
            type="number"
            min={1}
            max={36}
            disabled={mode !== "fixed"}
            required={mode === "fixed"}
            value={cycles}
            onChange={(e) => setCycles(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="billing-contract-price">월 단가 (원 / 인)</Label>
        <Input
          id="billing-contract-price"
          required
          type="number"
          min={0}
          max={10000000}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
      </div>
      <div className="rounded-lg bg-emerald-50 p-3 text-xs leading-6 text-emerald-900">
        매월 {data.settings.billing_day}일 · {firstMonth}부터{" "}
        {lastMonth ? `${lastMonth}까지 ${cycles}회` : "매월 반복"}
        <br />
        이번 청구일~다음 청구일 전날 이용 인원 × {won(price)} · 선불
        <br />
        중간 합류 전액 · 계약 내 중복 제외 · 자동 발송 없음
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={
            pending ||
            !ids.length ||
            !validMonth ||
            (mode === "fixed" && !lastMonth)
          }
          className="bg-emerald-700 hover:bg-emerald-800"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}계약
          등록
        </Button>
      </DialogFooter>
    </form>
  );
}
