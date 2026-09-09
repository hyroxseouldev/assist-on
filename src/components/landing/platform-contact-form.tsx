"use client";

import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { sendContactInquiryAction, type ContactActionState } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_STATE: ContactActionState = { status: "idle", message: "" };

export function PlatformContactForm() {
  const [state, formAction] = useActionState(sendContactInquiryAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="hidden" aria-hidden="true">
        <Label htmlFor="contact-website">웹사이트</Label>
        <Input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="contact-name">이름</Label><Input id="contact-name" name="name" autoComplete="name" placeholder="성함을 알려주세요" required maxLength={80} /></div>
        <div className="space-y-2"><Label htmlFor="contact-email">이메일</Label><Input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@yourgym.com" required maxLength={254} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="contact-brand">체육관 / 브랜드명</Label><Input id="contact-brand" name="brand" autoComplete="organization" placeholder="함께 성장할 팀의 이름" required maxLength={120} /></div>
      <div className="space-y-2">
        <Label htmlFor="contact-type">운영 형태</Label>
        <select id="contact-type" name="type" className="h-12 w-full rounded-lg border border-white/15 bg-[#111316] px-3 text-base text-zinc-200 focus-visible:outline-2 focus-visible:outline-blue-400 sm:text-sm">
          <option>개인 코칭</option><option>체육관 / 센터</option><option>온라인 프로그램</option><option>브랜드 / 복수 지점</option>
        </select>
      </div>
      <div className="space-y-2"><Label htmlFor="contact-message">어떤 운영을 만들고 싶으신가요?</Label><Textarea id="contact-message" name="message" placeholder="회원 규모, 운영 중인 프로그램, 해결하고 싶은 고민을 편하게 남겨주세요." className="min-h-32 resize-y" required maxLength={3000} /></div>
      <SubmitButton />
      <div aria-live="polite" className={`min-h-6 text-xs leading-6 ${state.status === "error" ? "text-red-300" : state.status === "success" ? "text-emerald-300" : "text-zinc-400"}`}>
        {state.status === "success" ? <p className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{state.message}</p> : <p>{state.message || "입력한 정보는 문의 메일 발송에만 사용됩니다."}</p>}
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-[#4e70dc] text-white hover:bg-[#4161c8] disabled:opacity-70">
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? "문의 전송 중..." : "도입 문의 보내기"}
      {!pending ? <ArrowUpRight className="size-4" aria-hidden="true" /> : null}
    </Button>
  );
}
