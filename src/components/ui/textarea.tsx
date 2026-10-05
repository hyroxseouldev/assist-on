import * as React from "react"

import { cn } from "@/lib/utils"

const textareaAppearances = {
  "default": "",
  "brand": "rounded-none border-white/8 bg-brand-input text-brand-foreground placeholder:text-brand-placeholder",
} as const

function Textarea({ appearance = "default", className, ...props }: React.ComponentProps<"textarea"> & {
  appearance?: keyof typeof textareaAppearances
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        textareaAppearances[appearance],
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
