"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
  button: {
    text: string;
    url: string;
  };
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
      button: {
        text: "Get Started",
        url: "https://shadcnblocks.com",
      },
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
      button: {
        text: "Purchase",
        url: "https://shadcnblocks.com",
      },
      highlighted: true,
    },
  ],
};

const Pricing2 = (props: Props) => {
  const { heading, description, plans, className, id } = {
    ...defaultProps,
    ...props,
  };

  const [isYearly, setIsYearly] = useState(false);
  return (
    <section id={id} className={cn("scroll-mt-24 py-32", className)}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-5 max-w-5xl text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight lg:text-5xl">
            {heading}
          </h2>
          <p className="text-muted-foreground lg:text-lg">{description}</p>
        </div>
        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center gap-5 text-base font-semibold">
            월간
            <Switch
              className="scale-125"
              checked={isYearly}
              onCheckedChange={() => setIsYearly(!isYearly)}
            />
            연간
          </div>
          <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col items-stretch gap-4 md:flex-row md:items-stretch md:justify-center">
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
                  <CardFooter className="mt-auto">
                    <Button
                      asChild
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      <a href={plan.button.url} target="_blank">
                        {plan.button.text}
                      </a>
                    </Button>
                  </CardFooter>
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
