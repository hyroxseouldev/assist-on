import { ArrowRight, CheckCircle2, Flag, Gauge, Search, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DemoLandingPageCta = {
  label: string;
  href: string;
};

type DemoLandingPageSection = {
  title: string;
  description?: string;
  points?: string[];
  closing?: string;
};

export type DemoLandingPageContent = {
  badge: string;
  hero: {
    title: string;
    subtitle: string;
    description: string[];
    primaryCta: DemoLandingPageCta;
    secondaryNote?: string;
    highlights?: Array<{
      eyebrow: string;
      title: string;
      description: string;
      emphasized?: boolean;
    }>;
  };
  problem: DemoLandingPageSection;
  solution: DemoLandingPageSection;
  value: DemoLandingPageSection;
  outcome: DemoLandingPageSection;
  cta: {
    eyebrow?: string;
    title: string;
    description: string;
    primaryCta: DemoLandingPageCta;
    alternatives?: string[];
  };
};

type DemoLandingPageProps = {
  content: DemoLandingPageContent;
};

const SECTION_STYLES = {
  problem: {
    icon: Search,
    iconClassName: "bg-amber-100 text-amber-700",
    cardClassName: "border-amber-200/80 bg-white/95",
  },
  solution: {
    icon: Gauge,
    iconClassName: "bg-sky-100 text-sky-700",
    cardClassName: "border-sky-200/80 bg-white/95",
  },
  value: {
    icon: Target,
    iconClassName: "bg-emerald-100 text-emerald-700",
    cardClassName: "border-emerald-200/80 bg-white/95",
  },
  outcome: {
    icon: Flag,
    iconClassName: "bg-violet-100 text-violet-700",
    cardClassName: "border-violet-200/80 bg-white/95",
  },
} as const;

function LandingSection({
  section,
  icon: Icon,
  iconClassName,
  cardClassName,
}: {
  section: DemoLandingPageSection;
  icon: typeof Search;
  iconClassName: string;
  cardClassName: string;
}) {
  return (
    <Card className={`rounded-[2rem] shadow-lg shadow-zinc-900/5 ${cardClassName}`}>
      <CardHeader className="space-y-4">
        <div className={`flex size-12 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="size-5" />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{section.title}</CardTitle>
          {section.description ? <p className="max-w-3xl text-sm leading-7 text-zinc-700 sm:text-base">{section.description}</p> : null}
        </div>
      </CardHeader>

      {(section.points?.length || section.closing) ? (
        <CardContent className="space-y-4">
          {section.points?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {section.points.map((point) => (
                <div
                  key={point}
                  className="flex gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-4 text-sm leading-6 text-zinc-700"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          ) : null}

          {section.closing ? <p className="text-sm leading-7 text-zinc-700 sm:text-base">{section.closing}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function DemoLandingPage({ content }: DemoLandingPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:gap-8 lg:pt-14">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,#fffdf6_0%,#ffffff_45%,#edf7f1_100%)] px-6 py-8 shadow-xl shadow-zinc-900/5 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">
              <Sparkles className="size-3.5" />
              {content.badge}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">{content.hero.title}</h1>
              <p className="max-w-3xl text-xl font-medium leading-snug text-zinc-800 sm:text-2xl">{content.hero.subtitle}</p>
              <div className="space-y-3 text-sm leading-7 text-zinc-700 sm:text-base">
                {content.hero.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800">
                <a href={content.hero.primaryCta.href}>
                  {content.hero.primaryCta.label}
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              {content.hero.secondaryNote ? <p className="text-sm text-zinc-600">{content.hero.secondaryNote}</p> : null}
            </div>
          </div>

          {content.hero.highlights?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {content.hero.highlights.map((highlight) => (
                <div
                  key={`${highlight.eyebrow}-${highlight.title}`}
                  className={highlight.emphasized
                    ? "rounded-[1.75rem] border border-zinc-950 bg-zinc-950 p-5 text-white shadow-sm shadow-zinc-900/10"
                    : "rounded-[1.75rem] border border-zinc-200/80 bg-white/90 p-5 shadow-sm shadow-zinc-900/5"}
                >
                  <p
                    className={highlight.emphasized
                      ? "text-xs font-medium uppercase tracking-[0.22em] text-white/55"
                      : "text-xs font-medium uppercase tracking-[0.22em] text-zinc-500"}
                  >
                    {highlight.eyebrow}
                  </p>
                  <p className={highlight.emphasized ? "mt-3 text-xl font-semibold text-white" : "mt-3 text-xl font-semibold text-zinc-950"}>
                    {highlight.title}
                  </p>
                  <p className={highlight.emphasized ? "mt-2 text-sm leading-6 text-white/72" : "mt-2 text-sm leading-6 text-zinc-600"}>
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <LandingSection section={content.problem} {...SECTION_STYLES.problem} />
      <LandingSection section={content.solution} {...SECTION_STYLES.solution} />
      <LandingSection section={content.value} {...SECTION_STYLES.value} />
      <LandingSection section={content.outcome} {...SECTION_STYLES.outcome} />

      <section
        id="apply"
        className="overflow-hidden rounded-[2rem] border border-zinc-900 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.24),transparent_35%),linear-gradient(145deg,#111827_0%,#0f172a_52%,#052e16_100%)] px-6 py-8 text-zinc-50 shadow-xl shadow-zinc-900/15 sm:px-10 sm:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              {content.cta.eyebrow ?? "Final CTA"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.cta.title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{content.cta.description}</p>

            <Button asChild size="lg" className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300">
              <a href={content.cta.primaryCta.href}>
                {content.cta.primaryCta.label}
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>

          {content.cta.alternatives?.length ? (
            <div className="rounded-[1.75rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">CTA 문구 후보</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {content.cta.alternatives.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-medium text-zinc-100"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
