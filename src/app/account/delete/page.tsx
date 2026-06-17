import type { Metadata } from "next";
import Link from "next/link";

import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPPORT_EMAIL = "vividxxxxx@gmail.com";

const requestSteps = [
  "아래 이메일 요청 버튼을 눌러 계정 삭제 요청 메일을 작성합니다.",
  "가입 이메일, 이름, 이용 중인 테넌트 또는 프로그램명을 입력합니다.",
  "요청 내용에 'CLYR Training 계정 및 관련 데이터 삭제를 요청합니다.'를 포함합니다.",
  "요청을 보내면 본인 확인 후 계정 삭제 또는 비활성화 절차를 진행합니다.",
];

const emailRequestItems = ["가입 이메일", "이름", "이용 중인 테넌트 또는 프로그램명", "계정 삭제 요청 문구"];

const deletedDataItems = [
  "계정 프로필: 이름, 이메일 기반 식별 정보, 계정 상태",
  "서비스 이용 정보: 멤버십, 프로그램 접근권, 주문/구독 상태",
  "운동 기록, 프로그램 참여 기록 등 계정과 연결된 이용 데이터",
  "활성 구독은 서비스 정책에 따라 해지 예약 처리됩니다.",
];

const retainedDataItems = [
  "결제, 환불, 정산, 분쟁 대응, 부정 이용 방지에 필요한 주문/결제 기록",
  "전자상거래 등 관련 법령에서 보관 의무가 있는 거래 기록",
  "보관 기간이 끝난 데이터는 파기하거나 개인을 식별할 수 없는 형태로 처리합니다.",
];

export const metadata: Metadata = {
  title: "CLYR Training 계정 및 데이터 삭제 요청",
  description: "Google Play 등록정보에 제공되는 CLYR Training 계정 및 관련 데이터 삭제 요청 안내 페이지입니다.",
};

export default function AccountDeleteGuidePage() {
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "CLYR Training 계정 삭제 요청"
  )}&body=${encodeURIComponent(
    "가입 이메일:\n이름:\n이용 중인 테넌트 또는 프로그램명:\n요청 내용: CLYR Training 계정 및 관련 데이터 삭제를 요청합니다."
  )}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <section className="space-y-4">
          <Link href="/" className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-900">
            CLYR Training
          </Link>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Account deletion</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              CLYR Training 계정 및 관련 데이터 삭제 요청
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-600">
              이 페이지는 Google Play 스토어 등록정보에 표시되는 CLYR Training 계정 삭제 안내입니다. 사용자는
              아래 절차에 따라 계정과 관련 데이터 삭제를 요청할 수 있습니다.
            </p>
          </div>
        </section>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">계정 삭제 요청 방법</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
              {requestSteps.map((step, index) => (
                <li key={step} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <span className="mb-2 block text-xs font-semibold text-zinc-500">STEP {index + 1}</span>
                  <span className="leading-6">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11">
                <a href={mailtoHref}>
                  이메일로 요청하기
                  <Mail className="size-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">로그인할 수 없는 경우</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-zinc-700">
            <p>
              계정 삭제를 요청하려면{" "}
              <a className="font-medium text-zinc-950 underline underline-offset-4" href={mailtoHref}>
                {SUPPORT_EMAIL}
              </a>
              으로 아래 정보를 함께 보내 주세요. 본인 확인과 계정 식별 후 삭제 또는 비활성화 절차를 진행합니다.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              {emailRequestItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">삭제 또는 비활성화되는 데이터</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                {deletedDataItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">보관되는 데이터와 기간</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">
                {retainedDataItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
                법령상 보관 의무 또는 정산, 환불, 분쟁 대응에 필요한 정보는 목적 달성 또는 법정 보관 기간 종료 시까지
                보관될 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
