import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const badgeAppearances = {
  "gold": "gap-1 border-warning-border bg-gradient-to-r from-warning-line to-gold-soft text-warning-darkest shadow-[0_4px_16px_rgba(245,158,11,0.25)]",
  "silver": "gap-1 border-silver-line bg-gradient-to-r from-silver-soft to-surface-muted text-silver-ink shadow-[0_3px_12px_rgba(100,116,139,0.2)]",
  "bronze": "gap-1 border-bronze-line bg-gradient-to-r from-bronze-soft to-warning-soft text-bronze-ink shadow-[0_3px_12px_rgba(234,88,12,0.2)]",
  "critical": "border-critical-border bg-critical-soft text-critical-ink",
  "inactive": "border-line-strong bg-surface-muted text-ink-secondary",
  "info": "border-info-line bg-info-soft text-info-ink",
  "age-new": "border-0 bg-surface-muted text-ink-secondary",
  "age-pending": "border-0 bg-warning-soft text-warning-deep",
  "age-overdue": "border-0 bg-danger-soft text-danger-ink",
  "success-text": "text-success-ink",
  "default": "",
  "ink": "bg-ink text-white hover:bg-ink",
  "success-inverse": "border-success-ink/50 bg-success-dark text-success-soft",
  "normal": "font-normal",
  "caption": "text-2xs",
  "success-caption": "text-2xs text-success-ink",
  "success-soft": "bg-success-soft text-success-deep",
  "warning-text": "text-warning-ink",
  "warning": "border-warning-border bg-warning-soft text-warning-deep",
  "success": "border-success-border bg-success-soft text-success-deep",
  "success-subtle": "border-success-line bg-success-surface text-success-deep",
  "muted-caption": "border-line text-2xs text-ink-subtle",
  "compact": "px-1.5 py-0 text-2xs",
  "success-surface": "bg-success-surface text-success-deep",
  "success-dark": "bg-success-soft text-success-dark",
  "success-solid": "bg-success-ink text-white hover:bg-success-ink",
  "brand-eyebrow": "rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1 text-caption font-bold tracking-brand-label text-brand-orange hover:bg-brand-orange/10",
  "brand-feature": "rounded-full border border-brand-orange/20 bg-brand-orange/10 px-3 py-1 text-2xs font-bold uppercase tracking-eyebrow-wide text-brand-orange transition-colors group-hover:border-transparent group-hover:bg-black/10 group-hover:text-brand-canvas hover:bg-brand-orange/10",
} as const

function Badge({
  appearance = "default",
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean } & { appearance?: keyof typeof badgeAppearances }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), badgeAppearances[appearance], className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
