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
    iconClassName: "bg-warning-soft text-warning-ink",
    cardTone: "problem",
  },
  solution: {
    icon: Gauge,
    iconClassName: "bg-info-soft text-info-text",
    cardTone: "solution",
  },
  value: {
    icon: Target,
    iconClassName: "bg-success-soft text-success-ink",
    cardTone: "value",
  },
  outcome: {
    icon: Flag,
    iconClassName: "bg-feature-soft text-feature-ink",
    cardTone: "outcome",
  },
} as const;

function LandingSection({
  section,
  icon: Icon,
  iconClassName,
  cardTone,
}: {
  section: DemoLandingPageSection;
  icon: typeof Search;
  iconClassName: string;
  cardTone: "problem" | "solution" | "value" | "outcome";
}) {
  return (
    <Card tone={cardTone} radius="panel" className="shadow-lg shadow-ink/5">
      <CardHeader className="space-y-4">
        <div className={`flex size-12 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="size-5" />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-2xl font-semibold tracking-tight text-ink-emphasis sm:text-3xl">{section.title}</CardTitle>
          {section.description ? <p className="max-w-3xl text-sm leading-7 text-ink-secondary sm:text-base">{section.description}</p> : null}
        </div>
      </CardHeader>

      {(section.points?.length || section.closing) ? (
        <CardContent className="space-y-4">
          {section.points?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {section.points.map((point) => (
                <div
                  key={point}
                  className="flex gap-3 rounded-2xl border border-line/80 bg-surface-subtle/90 px-4 py-4 text-sm leading-6 text-ink-secondary"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-strong" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          ) : null}

          {section.closing ? <p className="text-sm leading-7 text-ink-secondary sm:text-base">{section.closing}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export function DemoLandingPage({ content }: DemoLandingPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:gap-8 lg:pt-14">
      <section className="overflow-hidden rounded-panel border border-line/80 bg-training-hero px-6 py-8 shadow-xl shadow-ink/5 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-success-line bg-success-surface px-3 py-1 text-xs font-semibold uppercase tracking-brand-wide text-success-deep">
              <Sparkles className="size-3.5" />
              {content.badge}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-ink-emphasis sm:text-5xl lg:text-6xl">{content.hero.title}</h1>
              <p className="max-w-3xl text-xl font-medium leading-snug text-ink-strong sm:text-2xl">{content.hero.subtitle}</p>
              <div className="space-y-3 text-sm leading-7 text-ink-secondary sm:text-base">
                {content.hero.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" appearance="ink">
                <a href={content.hero.primaryCta.href}>
                  {content.hero.primaryCta.label}
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              {content.hero.secondaryNote ? <p className="text-sm text-ink-muted">{content.hero.secondaryNote}</p> : null}
            </div>
          </div>

          {content.hero.highlights?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {content.hero.highlights.map((highlight) => (
                <div
                  key={`${highlight.eyebrow}-${highlight.title}`}
                  className={highlight.emphasized
                    ? "rounded-feature border border-ink-emphasis bg-ink-emphasis p-5 text-white shadow-sm shadow-ink/10"
                    : "rounded-feature border border-line/80 bg-white/90 p-5 shadow-sm shadow-ink/5"}
                >
                  <p
                    className={highlight.emphasized
                      ? "text-xs font-medium uppercase tracking-brand-wide text-white/55"
                      : "text-xs font-medium uppercase tracking-brand-wide text-ink-subtle"}
                  >
                    {highlight.eyebrow}
                  </p>
                  <p className={highlight.emphasized ? "mt-3 text-xl font-semibold text-white" : "mt-3 text-xl font-semibold text-ink-emphasis"}>
                    {highlight.title}
                  </p>
                  <p className={highlight.emphasized ? "mt-2 text-sm leading-6 text-white/72" : "mt-2 text-sm leading-6 text-ink-muted"}>
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
        className="overflow-hidden rounded-panel border border-ink bg-training-dark px-6 py-8 text-surface-subtle shadow-xl shadow-ink/15 sm:px-10 sm:py-12"
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-brand-wide text-success-line">
              {content.cta.eyebrow ?? "Final CTA"}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.cta.title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-line-strong sm:text-base">{content.cta.description}</p>

            <Button asChild size="lg" appearance="positive">
              <a href={content.cta.primaryCta.href}>
                {content.cta.primaryCta.label}
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>

          {content.cta.alternatives?.length ? (
            <div className="rounded-feature border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
              <p className="text-sm font-semibold text-white">CTA 문구 후보</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {content.cta.alternatives.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-medium text-surface-muted"
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
