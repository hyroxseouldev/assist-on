"use client";

import { ArrowRight } from "lucide-react";
import { motion, useInView, useReducedMotion, type Transition } from "motion/react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Image {
  src: string;
  alt: string;
  srcDark?: string;
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

interface HeroBasicProps {
  heading: React.ReactNode;
  description: React.ReactNode;
  buttons?: Buttons;
  image: Image;
  byline?: string;
  className?: string;
}

type Hero115Props = HeroBasicProps;
type Props = Partial<Hero115Props>;

const defaultProps: Hero115Props = {
  heading: "Blocks Built With Shadcn & Tailwind",
  description: "Finely crafted components built with React, Tailwind and shadcn/ui. Developers can copy and paste these blocks directly into their project.",
  buttons: {
    primary: {
      text: "Browse Components",
      url: "https://shadcnblocks.com",
    },
    secondary: {
      text: "View GitHub",
      url: "https://shadcnblocks.com",
    },
  },
  image: {
    src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/modern/saas-hero/saas-hero-1-16x9.png",
    srcDark: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/modern/saas-hero/saas-hero-1-16x9-dark.png",
    alt: "Hero Image Placeholder",
  },
  byline: "Trusted by 25,000+ businesses worldwide",
};

const Hero115 = (props: Props) => {
  const { heading, description, buttons, image, byline, className } = {
    ...defaultProps,
    ...props,
  };
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {
    once: true,
    margin: "0px 0px -15% 0px",
  });
  const shouldReduceMotion = useReducedMotion();
  const revealProps = (delay: number) => {
    const transition: Transition = {
      delay: shouldReduceMotion ? 0 : delay,
      duration: shouldReduceMotion ? 0 : 0.5,
      ease: "easeOut",
    };

    return {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    animate: isInView
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
      transition,
    };
  };

  return (
    <section ref={sectionRef} className={cn("overflow-hidden py-24 sm:py-32", className)}>
      <div className="container mx-auto">
        <div className="flex flex-col gap-5">
          <div className="relative isolate flex flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 mx-auto size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border mask-[linear-gradient(to_top,transparent,transparent,white,white,white,transparent,transparent)] p-16 [-webkit-mask-image:linear-gradient(to_top,transparent,transparent,white,white,white,transparent,transparent)] md:size-[1300px] md:p-32"
            >
              <div className="size-full rounded-full border border-border p-16 md:p-32">
                <div className="size-full rounded-full border border-border" />
              </div>
            </div>
            {byline && (
              <motion.div
                className="relative overflow-hidden rounded-full bg-zinc-200 p-px shadow-sm before:absolute before:inset-[-80%] before:animate-[spin_4s_linear_infinite] before:bg-[conic-gradient(from_90deg,transparent_0_72%,#71717a_80%,transparent_88%)]"
                {...revealProps(0)}
              >
                <span className="relative block rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-zinc-900">
                  {byline}
                </span>
              </motion.div>
            )}
            <motion.h1
              className="mx-auto max-w-5xl text-center text-3xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-4xl lg:text-5xl"
              {...revealProps(0.1)}
            >
              {heading}
            </motion.h1>
            <motion.p
              className="mx-auto max-w-4xl text-center text-base leading-7 text-muted-foreground md:text-lg md:leading-8"
              {...revealProps(0.2)}
            >
              {description}
            </motion.p>
            <motion.div className="flex flex-col items-center gap-3 pt-3 pb-12" {...revealProps(0.3)}>
              {buttons?.primary && (
                <Button size="lg" asChild className="w-auto px-6">
                  <a href={buttons.primary.url}>
                    {buttons.primary.text}
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              )}
            </motion.div>
          </div>
          {image.srcDark ? (
            <>
              <img
                src={image.src}
                alt={image.alt}
                className="mx-auto aspect-3/4 h-full max-h-[524px] w-[calc(100%-2rem)] max-w-5xl rounded-lg border border-border object-cover object-top-left md:aspect-video md:w-full md:object-top dark:hidden"
              />
              <img
                src={image.srcDark}
                alt={image.alt}
                className="mx-auto hidden aspect-3/4 h-full max-h-[524px] w-[calc(100%-2rem)] max-w-5xl rounded-lg border border-border object-cover object-top-left md:aspect-video md:w-full md:object-top dark:block"
              />
            </>
          ) : (
            <img
              src={image.src}
              alt={image.alt}
              className="mx-auto aspect-3/4 h-full max-h-[524px] w-[calc(100%-2rem)] max-w-5xl rounded-lg border border-border object-cover object-top-left md:aspect-video md:w-full md:object-top"
            />
          )}
        </div>
      </div>
    </section>
  );
};

export { Hero115 };
