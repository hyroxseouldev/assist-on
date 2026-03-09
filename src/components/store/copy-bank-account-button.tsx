"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyBankAccountButton({ accountNumber }: { accountNumber: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!accountNumber.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast.success("계좌번호가 복사되었습니다.");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("계좌번호 복사에 실패했습니다.");
    }
  };

  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "복사됨" : "복사"}
    </Button>
  );
}
