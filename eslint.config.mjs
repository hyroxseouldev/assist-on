import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { shadcnRules } from "./eslint.shadcn.config.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...shadcnRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "exports/**/dist/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
