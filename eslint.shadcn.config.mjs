import { defineConfig } from "eslint/config";
import nextTs from "eslint-config-next/typescript";
import { plugin as shadcn } from "@shadcn/lint";

const layoutClasses = ["layout", "max-h-dialog", "max-h-dialog-full", "max-h-dialog-tall", "max-h-sheet", "max-h-sheet-tall", "max-h-preview", "max-h-image-preview", "max-w-dialog", "max-w-dialog-sm", "max-w-dialog-wide", "w-program-picker", "h-review-panel", "pb-safe"];

export const shadcnRules = [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-raw-colors": ["error", { scanAllStrings: true }],
      "shadcn/no-arbitrary-values": ["error", {
        scanAllStrings: true,
        // Responsive column definitions belong to each screen's layout.
        // Color, type, spacing and decorative values still require tokens.
        allow: ["grid-cols"],
      }],
      "shadcn/no-unknown-classes": "error",
      "shadcn/require-static-classes": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/no-restyle": ["error", {
        allow: layoutClasses,
        contracts: [
          // Content slots intentionally accept the surrounding page's spacing
          // and typography. Token checks apply inside these contracts too.
          { pattern: "^Table(Head|Cell|Header|Footer|Caption)$", allow: [...layoutClasses, "spacing", "typography", "color"] },
          { pattern: "^(Card|NonBorderCard)$", allow: [...layoutClasses, "spacing", "shape", "color", "effects"] },
          { pattern: "^Card(Header|Content|Footer|Title|Description)$", allow: [...layoutClasses, "spacing", "typography", "color", "motion"] },
          { pattern: "^(Sheet|Drawer)(Content|Header|Title|Description)$", allow: [...layoutClasses, "spacing", "shape", "typography", "color"] },
          { pattern: "^Accordion(Content|Item)?$", allow: [...layoutClasses, "spacing", "shape", "color", "typography"] },
          { pattern: "^Sidebar(Group|GroupLabel|Content|Header|Footer|Inset|Separator)?$", allow: [...layoutClasses, "spacing", "shape", "color"] },
          { pattern: "^(Tabs|TabsContent|DropdownMenuLabel|PopoverContent|CommandItem)$", allow: [...layoutClasses, "spacing"] },
          { pattern: "^Label$", allow: [...layoutClasses, "typography", "color", "gap"] },
          { pattern: "^TooltipContent$", allow: [...layoutClasses, "leading"] },
          { pattern: "^Skeleton$", allow: [...layoutClasses, "rounded"] },
        ],
      }],
    },
  },
  {
    // This file contains Tailwind Merge group names, not JSX class values.
    files: ["src/lib/utils.ts"],
    rules: { "shadcn/no-raw-colors": ["error", { scanAllStrings: false }] },
  },
  {
    files: ["src/components/ui/**"],
    rules: {
      // Primitive implementations own their styles and forward className.
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },
];

export default defineConfig([...nextTs, ...shadcnRules]);
