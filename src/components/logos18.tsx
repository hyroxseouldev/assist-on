"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

type LogosSimpleStaticLogo = Logo & {
  href?: string;
};
interface Logo {
  src: string;
  alt: string;
  srcDark?: string;
  className?: string;
}

interface LogosSimpleStaticProps {
  heading?: string;
  description?: string;
  logos: LogosSimpleStaticLogo[];
  className?: string;
}

type Props = Partial<LogosSimpleStaticProps>;

const defaultProps: LogosSimpleStaticProps = {
  heading: undefined,
  logos: [
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-1.svg",
      alt: "Company logo 1",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-2.svg",
      alt: "Company logo 2",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-3.svg",
      alt: "Company logo 3",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-4.svg",
      alt: "Company logo 4",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-5.svg",
      alt: "Company logo 5",
      className: "h-5 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-6.svg",
      alt: "Company logo 6",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-7.svg",
      alt: "Company logo 7",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-8.svg",
      alt: "Company logo 8",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-9.svg",
      alt: "Company logo 9",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-10.svg",
      alt: "Company logo 10",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-11.svg",
      alt: "Company logo 11",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
    {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/logos/fictional-company-logo-12.svg",
      alt: "Company logo 12",
      className: "h-7 w-auto",
      href: "https://www.shadcnblocks.com",
    },
  ],
};

const Logos18 = (props: Props) => {
  const { heading, description, logos, className } = {
    ...defaultProps,
    ...props,
  };
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {
    once: true,
    margin: "0px 0px -15% 0px",
  });
  const shouldReduceMotion = useReducedMotion();

  const MAX_LOGOS = 6;
  const visibleLogos = logos.slice(0, MAX_LOGOS);
  const renderLogo = (logo: LogosSimpleStaticLogo) => (
    <img
      src={logo.src}
      alt={logo.alt}
      className={cn(
        logo.className,
        "h-auto max-h-7 w-auto object-contain dark:invert",
      )}
    />
  );

  return (
    <section ref={sectionRef} className={cn("py-12 md:py-16 lg:py-32", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {heading && (
            <div className="mb-8 max-w-2xl">
              <motion.h2
                className="text-sm font-semibold tracking-tight text-zinc-950 sm:text-base"
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
              >
                {heading}
              </motion.h2>
              {description && (
                <motion.p
                  className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm"
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                  transition={{ delay: shouldReduceMotion ? 0 : 0.12, duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
                >
                  {description}
                </motion.p>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 lg:gap-12">
            {visibleLogos.map((logo, index) => (
              <div
                key={`${logo.src}-${index}`}
                className="flex aspect-3/1 w-28 items-center justify-center sm:w-32"
              >
                {logo.href ? (
                  <a
                    href={logo.href}
                    target={logo.href.startsWith("http") ? "_blank" : undefined}
                    rel={logo.href.startsWith("http") ? "noreferrer" : undefined}
                    aria-label={`${logo.alt} 웹사이트 열기`}
                    className="inline-flex items-center justify-center transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-4"
                  >
                    {renderLogo(logo)}
                  </a>
                ) : (
                  renderLogo(logo)
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Logos18 };
