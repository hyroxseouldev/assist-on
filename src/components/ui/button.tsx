import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const buttonAppearances = {
  "date-selected": "font-normal text-foreground",
  "date-placeholder": "font-normal text-muted-foreground",
  "platform": "rounded-full bg-platform-primary px-6 text-sm font-medium text-white hover:bg-platform-primary-hover",
  "platform-outline": "rounded-full border border-white/15 bg-transparent px-6 text-sm text-line hover:bg-white/5 hover:text-white",
  "default": "",
  "success": "bg-success-ink hover:bg-success-deep",
  "danger-outline": "border-danger-line text-danger-strong hover:bg-danger-surface hover:text-danger-ink",
  "ink": "bg-ink-emphasis text-white hover:bg-ink-strong",
  "success-solid": "bg-success-ink text-white hover:bg-success-deep",
  "compact-heading": "px-1.5 text-xs font-semibold text-ink-emphasis",
  "compact-danger": "border-danger-line bg-white px-2 text-xs text-danger-ink hover:bg-danger-surface hover:text-danger-deep",
  "program-picker": "gap-3 px-3 py-2",
  "date": "font-normal",
  "login": "gap-2 rounded-xl bg-success-deep text-sm font-semibold text-white shadow-none hover:bg-success-dark focus-visible:ring-success-ink/30",
  "wide": "px-6",
  "brand": "rounded-none bg-brand-orange px-7 text-sm font-bold tracking-eyebrow-wide text-brand-canvas hover:bg-brand-orange-strong",
  "brand-link": "rounded-none px-0 text-sm font-semibold tracking-eyebrow text-brand-subtle hover:bg-transparent hover:text-brand-foreground",
  "brand-submit": "rounded-none bg-brand-orange px-6 text-sm font-bold tracking-eyebrow-wide text-brand-canvas hover:bg-brand-orange-strong",
  "light": "bg-white text-ink-emphasis hover:bg-surface-muted",
  "inverse": "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white",
  "positive": "bg-success-bright text-ink-emphasis hover:bg-success-border",
  "landing": "rounded-xl bg-ink px-6 text-sm font-semibold text-white hover:bg-ink-secondary",
  "landing-outline": "rounded-xl border-line-strong",
  "landing-positive": "rounded-xl bg-success text-ink-emphasis hover:bg-success-bright",
  "platform-submit": "rounded-full bg-platform-primary text-white hover:bg-platform-primary-hover disabled:opacity-70",
  "brand-nav": "rounded-none bg-brand-orange px-5 text-xs font-bold tracking-eyebrow-wide text-brand-canvas hover:bg-brand-orange-strong",
  "brand-menu": "text-brand-foreground hover:bg-white/10 hover:text-brand-foreground",
  "brand-mobile": "rounded-xl bg-brand-orange text-sm font-bold text-brand-canvas hover:bg-brand-orange-strong",
  "tenant-mobile": "rounded-2xl px-4 text-sm font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink-emphasis",
  "tenant-menu": "text-ink-secondary hover:bg-surface-muted hover:text-ink-emphasis",
} as const

function Button({
  appearance = "default",
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    appearance?: keyof typeof buttonAppearances
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), buttonAppearances[appearance], className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
