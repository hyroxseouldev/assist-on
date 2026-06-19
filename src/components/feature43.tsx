"use client";

import {
  Blocks,
  ChartLine,
  ChevronRight,
  Globe,
  Layers,
  Lock,
  Palette,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { motion, useInView, useReducedMotion, type Transition } from "motion/react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface FeatureIconListItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
  href?: string;
}
interface Button {
  text: string;
  url: string;
  icon?: React.ReactNode;
}
interface Buttons {
  primary?: Button;
  secondary?: Button;
}

interface FeatureIconListProps {
  heading: React.ReactNode;
  description?: React.ReactNode;
  features?: FeatureIconListItem[];
  buttons?: Buttons;
  className?: string;
  id?: string;
}

type Feature43Props = FeatureIconListProps;
type Props = Partial<Feature43Props>;

const defaultProps: Feature43Props = {
  heading: "Build faster with production ready features",
  description: "Using technology to make program operations simpler, smarter and more consistent.",
  features: [
    {
      icon: <Zap className="size-5" />,
      title: "Full Source Code",
      description:
        "Every block ships as plain React you own. No runtime dependency, no SDK lock-in, just copy and customize.",
    },
    {
      icon: <Palette className="size-5" />,
      title: "Responsive Design",
      description:
        "Every block adapts seamlessly from mobile to desktop with Tailwind's mobile-first utility classes.",
    },
    {
      icon: <Shield className="size-5" />,
      title: "Accessibility & Usability",
      description:
        "Built on Radix UI primitives with proper ARIA attributes, keyboard navigation, and focus management.",
    },
    {
      icon: <Settings className="size-5" />,
      title: "TypeScript Native",
      description:
        "Fully typed props and interfaces so your editor catches issues before they reach production.",
    },
    {
      icon: <Layers className="size-5" />,
      title: "Customizable",
      description:
        "Override any prop, swap icons, adjust spacing — every block is designed to be extended, not locked down.",
    },
    {
      icon: <Rocket className="size-5" />,
      title: "Production Ready",
      description:
        "Battle-tested in real projects. No placeholder hacks, no lorem ipsum — clean code you can ship today.",
    },
    {
      icon: <Blocks className="size-5" />,
      title: "Registry Compatible",
      description:
        "Install blocks directly with the shadcn CLI. Dependencies and registry items are listed in every block's MDX.",
    },
    {
      icon: <Globe className="size-5" />,
      title: "Framework Agnostic",
      description:
        "Plain ESM + React that works with Next.js, Vite, Remix, and Astro without any Shadcnblocks SDK.",
    },
    {
      icon: <ChartLine className="size-5" />,
      title: "Consistent Spacing",
      description:
        "Shared section padding, container widths, and gap scales so blocks stack into cohesive pages.",
    },
    {
      icon: <Sparkles className="size-5" />,
      title: "Theme Tokens",
      description:
        "All colors come from your shadcn/ui theme — foreground, muted, primary, card — no hardcoded values.",
    },
    {
      icon: <Workflow className="size-5" />,
      title: "Copy Paste Workflow",
      description:
        "Browse the explorer, preview with your theme, then copy the code directly into your project.",
    },
    {
      icon: <Lock className="size-5" />,
      title: "Open Source",
      description:
        "MIT-licensed source code you own completely. Fork it, modify it, sell products built with it.",
    },
  ],
  buttons: {
    primary: {
      text: "Browse Components",
      url: "https://www.shadcnblocks.com",
    },
  },
};

const MAX_FEATURES = 6;

const Feature43 = (props: Props) => {
  const { heading, description, buttons, features, className, id } = {
    ...defaultProps,
    ...props,
  };
  const items = (features ?? []).slice(0, MAX_FEATURES);
  const leftItems = items.slice(0, 3);
  const rightItems = items.slice(3, 6);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {
    once: true,
    margin: "0px 0px -15% 0px",
  });
  const shouldReduceMotion = useReducedMotion();

  const getRevealTransition = (order: number): Transition => ({
    delay: shouldReduceMotion ? 0 : order * 0.18,
    duration: shouldReduceMotion ? 0 : 0.72,
    ease: [0.22, 1, 0.36, 1],
  });

  const renderFeature = (feature: FeatureIconListItem, index: number, side: "left" | "right", order: number) => (
    <motion.div
      key={`${side}-${feature.title}-${index}`}
      className={cn(
        "flex flex-col items-center gap-4 text-center lg:grid lg:grid-cols-[auto_1fr] lg:text-left",
        side === "left" && "lg:grid-cols-[1fr_auto]",
      )}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 24 }}
      transition={getRevealTransition(order)}
    >
      <div
        className={cn(
          "order-1 flex size-16 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-50 text-zinc-700 shadow-sm",
          side === "left" && "lg:order-2",
        )}
      >
        {feature.icon}
      </div>
      <div className={cn("order-2 min-w-0 max-w-[300px]", side === "left" && "lg:order-1 lg:justify-self-end lg:text-right")}>
        <h3 className="text-[15px] font-semibold tracking-tight text-zinc-950 md:text-base">{feature.title}</h3>
        <p className={cn("mx-auto mt-2 max-w-[245px] text-[13px] leading-5 text-zinc-500 md:text-sm md:leading-6 lg:mx-0", side === "left" && "lg:ml-auto")}>
          {feature.description}
        </p>
      </div>
    </motion.div>
  );

  return (
    <section ref={sectionRef} id={id} className={cn("scroll-mt-24 bg-white py-24 sm:py-32", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="mx-auto mb-16 max-w-5xl text-center md:mb-20">
            <motion.h2
              className="text-3xl font-bold tracking-tight text-balance text-zinc-950 sm:text-4xl lg:whitespace-nowrap lg:text-[44px]"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              transition={getRevealTransition(0)}
            >
              {heading}
            </motion.h2>
            {description && (
              <motion.p
                className="mx-auto mt-5 max-w-4xl text-base leading-7 text-zinc-500 sm:text-lg lg:whitespace-nowrap"
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                transition={getRevealTransition(1)}
              >
                {description}
              </motion.p>
            )}
          </div>
        )}
        <div className="grid items-center gap-12 xl:grid-cols-[minmax(220px,1fr)_minmax(300px,360px)_minmax(220px,1fr)] xl:gap-8">
          <div className="order-2 space-y-10 xl:order-1 xl:space-y-14">
            {leftItems.map((feature, i) => renderFeature(feature, i, "left", i + 3))}
          </div>

          <motion.div
            className="order-1 relative mx-auto w-full max-w-[340px] xl:order-2"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={getRevealTransition(2)}
          >
            <div
              aria-hidden
              className="absolute inset-x-8 top-10 h-80 rounded-full bg-violet-200/45 blur-3xl"
            />
            <div className="relative mx-auto rounded-[2.6rem] border border-zinc-300 bg-zinc-950 p-2 shadow-2xl shadow-zinc-950/20">
              <div className="overflow-hidden rounded-[2.05rem] bg-white">
                <div className="relative bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 px-6 pb-12 pt-5 text-white">
                  <div className="mx-auto mb-6 h-5 w-28 rounded-b-2xl bg-zinc-950" />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>9:41</span>
                    <span>CLYR</span>
                  </div>
                  <div className="mt-8 rounded-2xl bg-white/20 p-4 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">오늘의 피드백</span>
                      <span>12명</span>
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-white/25">
                      <div className="h-2 w-3/4 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
                <div className="-mt-8 px-5 pb-8">
                  <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-xl shadow-zinc-950/10">
                    <p className="text-sm font-semibold text-zinc-950">운영 현황</p>
                    <div className="mt-4 space-y-3">
                      {[
                        ["입금 확인", "8건"],
                        ["환불 대기", "2건"],
                        ["미답변 피드백", "5건"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-3">
                          <span className="text-sm font-medium text-zinc-700">{label}</span>
                          <div className="flex items-center gap-1 text-sm font-semibold text-violet-600">
                            {value}
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Brand</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">우리 프로그램 앱으로 운영 중</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="order-3 space-y-10 xl:space-y-14">
            {rightItems.map((feature, i) => renderFeature(feature, i, "right", i + 6))}
          </div>
        </div>
        {buttons?.primary?.url && (
          <div className="mt-16 flex justify-center">
            <Button size="lg" asChild>
              <a href={buttons.primary.url}>{buttons.primary.text}</a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export { Feature43 };
