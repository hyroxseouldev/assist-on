"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

interface PricingCards2CardsPlan {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyPeriod?: string;
  yearlyPeriod?: string;
  features: string[];
  highlighted?: boolean;
  featureListLabel?: string;
  image?: string;
}

interface PricingCards2CardsProps {
  heading: string;
  description: string;
  plans: PricingCards2CardsPlan[];
  className?: string;
  id?: string;
  showBillingToggle?: boolean;
}

type Pricing2Props = PricingCards2CardsProps;
type Props = Partial<Pricing2Props>;

const defaultProps: Pricing2Props = {
  heading: "Pricing",
  description: "Check out our affordable pricing plans",
  plans: [
    {
      name: "Free",
      image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/pricing-plans/plan1.svg",
      description: "For individuals getting started",
      monthlyPrice: "$0",
      yearlyPrice: "$0",
      monthlyPeriod: "/per month",
      yearlyPeriod: "/per year",
      features: [
        "Single user",
        "Basic components library",
        "Community support",
        "1GB storage space",
      ],
    },
    {
      name: "Pro",
      image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/image-set/placeholder/pricing-plans/plan2.svg",
      description: "For professionals",
      monthlyPrice: "$49",
      yearlyPrice: "$359",
      monthlyPeriod: "/per month",
      yearlyPeriod: "/per year",
      features: [
        "Up to 5 team members",
        "Advanced components library",
        "Priority support",
        "2GB storage space",
        "Team collaboration",
        "Custom branding",
      ],
      highlighted: true,
    },
  ],
};

const Pricing2 = (props: Props) => {
  const { heading, description, plans, className, id, showBillingToggle } = {
    ...defaultProps,
    showBillingToggle: true,
    ...props,
  };

  const [isYearly, setIsYearly] = useState(false);
  return (
    <section id={id} className={cn("scroll-mt-24 py-32", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-5 max-w-5xl text-center">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="flex flex-col items-center gap-10">
          {showBillingToggle ? (
            <div className="flex items-center gap-5 text-base font-semibold">
              월간
              <Switch
                className="scale-125"
                checked={isYearly}
                onCheckedChange={() => setIsYearly(!isYearly)}
              />
              연간
            </div>
          ) : null}
          <div className="mx-auto grid w-full max-w-6xl min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(plans ?? []).map((plan) => {
              const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const period = isYearly
                ? plan.yearlyPeriod ?? "/per year"
                : plan.monthlyPeriod ?? "/per month";

              return (
                <Card
                  key={plan.name}
                  className={cn(
                    "flex w-full max-w-full min-w-0 flex-col justify-between gap-8 text-left shadow-none ring-0 md:flex-1 md:basis-0",
                    plan.highlighted
                      ? "border-2 border-primary"
                      : "border border-border",
                  )}
                >
                  <CardHeader className="gap-0.5">
                    <CardTitle>
                      <p className="text-lg font-semibold">{plan.name}</p>
                    </CardTitle>
                    <div className="mb-5 flex min-w-0 flex-wrap items-end gap-x-1">
                      <span className="min-w-0 text-4xl font-medium tracking-tight">
                        {price}
                      </span>
                      {period ? (
                        <span className="text-xl font-normal text-muted-foreground">
                          {period}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  <CardContent>
                    <Separator className="mb-6" />
                    {plan.featureListLabel && (
                      <p className="mb-3 font-semibold">
                        {plan.featureListLabel}
                      </p>
                    )}
                    <ul className="flex flex-col gap-3">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <CircleCheck className="size-4 shrink-0" />
                          <span className="min-w-0 wrap-break-word">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing2 };
