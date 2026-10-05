"use client"

import type { CSSProperties } from "react";

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const progressAppearances = {
  "default": "",
  "success-soft": "bg-success-surface [&_[data-slot=progress-indicator]]:bg-success-strong",
  "success": "bg-surface-muted [&_[data-slot=progress-indicator]]:bg-success-strong",
  "ink": "bg-surface-muted [&_[data-slot=progress-indicator]]:bg-ink-strong",
  "positive": "[&_[data-slot=progress-indicator]]:bg-success",
} as const

function Progress({
  appearance = "default",
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  appearance?: keyof typeof progressAppearances
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", progressAppearances[appearance], className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="translate-x-(--progress-offset) bg-primary h-full w-full flex-1 transition-all"
        style={{ "--progress-offset": `-${100 - (value || 0)}%` } as CSSProperties}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
