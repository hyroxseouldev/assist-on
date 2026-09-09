"use client";

import { ArrowUpRight } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PlatformContactForm() {
  const [mailHref, setMailHref] = useState<string | null>(null);

  function prepareEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `이름: ${data.get("name")}\n이메일: ${data.get("email")}\n체육관 / 브랜드: ${data.get("brand")}\n운영 형태: ${data.get("type")}\n\n문의 내용:\n${data.get("message")}`;
    setMailHref(`mailto:vividxxxxx@gmail.com?subject=${encodeURIComponent("clyrtraining 도입 문의")}&body=${encodeURIComponent(body)}`);
  }

  return (
    <form onSubmit={prepareEmail} onChange={() => setMailHref(null)} className="space-y-5">
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
      <Button type="submit" className="h-12 w-full rounded-full bg-[#4e70dc] text-white hover:bg-[#4161c8]">문의 메일 준비하기 <ArrowUpRight className="size-4" /></Button>
      <div aria-live="polite" className="text-xs leading-6 text-zinc-400">
        {mailHref ? <p>문의 내용을 준비했어요. <a href={mailHref} className="font-semibold text-blue-300 underline underline-offset-4">메일 앱에서 열고 보내기</a><br />아직 전송되지 않았습니다. 메일 앱에서 전송을 완료해 주세요.</p> : <p>입력 내용은 서버에 저장되지 않습니다. 작성 후 메일 앱에서 전송해 주세요.</p>}
      </div>
    </form>
  );
}
