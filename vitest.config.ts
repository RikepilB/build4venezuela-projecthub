import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Pure-logic unit tests live in tests/. tsconfigPaths resolves the `@/` alias and
// extensionless TS imports the same way Next/tsc do. CI runs: lint → typecheck → test → build.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
