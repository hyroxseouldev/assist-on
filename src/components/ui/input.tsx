import * as React from "react"

import { cn } from "@/lib/utils"

const inputAppearances = {
  "default": "",
  "bare": "border-0 shadow-none",
  "surface": "bg-white",
  "search": "pl-9",
  "login": "rounded-xl border-line bg-surface-subtle/60 px-4 text-base shadow-none focus-visible:border-success-ink focus-visible:ring-success-ink/15 md:text-sm",
  "password": "rounded-xl border-line bg-surface-subtle/60 px-4 pr-12 text-base shadow-none focus-visible:border-success-ink focus-visible:ring-success-ink/15 md:text-sm",
  "brand": "rounded-none border-white/8 bg-brand-input text-brand-foreground placeholder:text-brand-placeholder",
  "dark": "border-ink-secondary bg-ink-strong text-surface-muted placeholder:text-ink-faint",
} as const

function Input({ appearance = "default", className, type, ...props }: React.ComponentProps<"input"> & {
  appearance?: keyof typeof inputAppearances
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        inputAppearances[appearance],
        className
      )}
      {...props}
    />
  )
}

export { Input }
