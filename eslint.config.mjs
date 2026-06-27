import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Committed agent tooling — vendored skill scripts (minified bundles, .cjs
    // helpers) that aren't app source. Linting them only spams the gate with
    // require()/no-unused-expressions noise; app code lives under src/.
    ".claude/**",
    // Playwright's own output (reports, traces) — generated, never linted.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
