"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";

import { CONTACT_EMAIL, DEFAULT_RESEND_FROM_EMAIL } from "@/lib/contact";

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  brand: z.string().trim().min(1).max(120),
  type: z.enum(["개인 코칭", "체육관 / 센터", "온라인 프로그램", "브랜드 / 복수 지점"]),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(0),
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const requestLog = new Map<string, number[]>();

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function isRateLimited(key: string) {
  const now = Date.now();
  const recentRequests = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLog.set(key, recentRequests);

  if (requestLog.size > 1_000) {
    for (const [entryKey, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(entryKey);
    }
  }

  return false;
}

function getError(message: string): ContactActionState {
  return { status: "error", message };
}

export async function sendContactInquiryAction(
  _previousState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = inquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    brand: formData.get("brand"),
    type: formData.get("type"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return getError("입력 내용을 다시 확인해 주세요. 문의 내용은 10자 이상 작성해 주세요.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM_EMAIL;

  if (!apiKey) {
    console.error("Contact email is not configured: RESEND_API_KEY is missing.");
    return getError("메일 발송 설정을 확인하고 있습니다. 잠시 후 다시 시도해 주세요.");
  }

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get("x-real-ip") || `email:${parsed.data.email.toLowerCase()}`;

  if (isRateLimited(clientKey)) {
    return getError("문의가 연속으로 접수되었습니다. 10분 후 다시 시도해 주세요.");
  }

  const { name, email, brand, type, message } = parsed.data;
  const submittedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const text = [
    "clyrtraining 랜딩 페이지에서 새 도입 문의가 접수되었습니다.",
    "",
    `이름: ${name}`,
    `이메일: ${email}`,
    `체육관 / 브랜드: ${brand}`,
    `운영 형태: ${type}`,
    `접수 시각: ${submittedAt}`,
    "",
    "문의 내용",
    message,
  ].join("\n");
  const idempotencyKey = createHash("sha256")
    .update(`${email.toLowerCase()}\n${brand}\n${message}`)
    .digest("hex");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(
      {
        from,
        to: [CONTACT_EMAIL],
        replyTo: email,
        subject: `[clyrtraining 도입 문의] ${brand} · ${name}`,
        text,
        tags: [{ name: "source", value: "landing-contact" }],
      },
      { idempotencyKey },
    );

    if (error) {
      console.error("Resend contact inquiry failed:", error.name, error.message);
      return getError("문의 전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 연락해 주세요.");
    }

    return { status: "success", message: "문의가 전송되었습니다. 확인 후 이메일로 연락드릴게요." };
  } catch (error) {
    console.error("Unexpected contact inquiry failure:", error instanceof Error ? error.message : "Unknown error");
    return getError("문의 전송에 실패했습니다. 잠시 후 다시 시도하거나 이메일로 연락해 주세요.");
  }
}
