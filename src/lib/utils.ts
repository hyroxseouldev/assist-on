import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Custom theme names must be classified before merging: text-caption is a
// font size, not a color, and decorative backgrounds are images, not colors.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      blur: ["subtle"],
      text: ["micro", "2xs", "caption", "body-sm", "body", "title", "display-sm", "display", "display-lg", "brand-hero", "brand-stat", "brand-heading"],
      leading: ["display-tight", "display", "display-relaxed", "heading", "heading-relaxed", "body"],
      tracking: ["display", "body", "caption", "label", "overline", "overline-wide", "eyebrow", "eyebrow-wide", "brand", "brand-wide", "brand-wider", "brand-label", "brand-spaced", "brand-max"],
      radius: ["device-inner", "device", "panel", "feature"],
      shadow: ["device-inner", "device"],
    },
    classGroups: {
      w: ["w-program-picker", "w-inset-page"],
      h: ["h-review-panel"],
      "min-h": ["min-h-half-screen"],
      "max-h": ["max-h-dialog-full", "max-h-dialog-tall", "max-h-dialog", "max-h-sheet", "max-h-sheet-tall", "max-h-preview", "max-h-image-preview"],
      "max-w": ["max-w-dialog", "max-w-dialog-sm", "max-w-dialog-wide", "max-w-inset-page"],
      pb: ["pb-safe"],
      scale: ["scale-row-hover"],
      transition: ["transition-reveal"],
      "bg-image": ["bg-border-sweep", "bg-brand-grid", "bg-brand-glow", "bg-brand-glow-deep", "bg-brand-device-glow", "bg-brand-gradient", "bg-demo-hero", "bg-demo-panel", "bg-training-hero", "bg-training-dark", "bg-training-page", "bg-training-glow", "bg-platform-hero"],
      "bg-size": ["bg-size-brand-grid"],
      "mask-image": ["mask-feature-fade", "mask-brand-grid", "mask-marquee"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
