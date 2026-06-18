import { Instagram, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "vividxxxxx@gmail.com";
const INSTAGRAM_HANDLE = "kxxclear";
const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}`;

interface HomeContactProps {
  id?: string;
}

function HomeContact({ id }: HomeContactProps) {
  const mailtoHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "clyrtraining 도입 문의",
  )}&body=${encodeURIComponent(
    "이름:\n브랜드/센터명:\n연락처:\n운영 중인 프로그램:\n문의 내용:",
  )}`;

  return (
    <section id={id} className="scroll-mt-24 py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-lg bg-accent p-8 md:rounded-xl lg:flex-row lg:items-center lg:justify-between lg:p-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight lg:text-5xl">
              Contact
            </h2>
            <p className="mt-4 text-muted-foreground lg:text-lg">
              코칭 앱 도입이나 데모가 필요하다면 편하게 연락주세요. 운영
              중인 프로그램에 맞춰 상담해드립니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Button size="lg" asChild>
              <a href={mailtoHref} aria-label={`Email ${SUPPORT_EMAIL}`}>
                <Mail className="size-4" />
                Email
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={`Instagram @${INSTAGRAM_HANDLE}`}
              >
                <Instagram className="size-4" />
                Instagram
              </a>
            </Button>
          </div>
        </div>
        <div className="mx-auto mt-5 flex max-w-5xl flex-col gap-2 text-sm font-medium text-muted-foreground sm:flex-row sm:gap-5">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            @{INSTAGRAM_HANDLE}
          </a>
        </div>
      </div>
    </section>
  );
}

export { HomeContact };
