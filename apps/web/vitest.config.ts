import { defineConfig } from "vitest/config";

import { stylexRenderingPlugin } from "./stylex.js";

export default defineConfig({
  plugins: [stylexRenderingPlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "jsdom",
          setupFiles: ["test/setup-reader-subviews.ts"],
          include: [
            "test/app.test.ts",
            "test/docs-head.test.ts",
            "test/overlay.test.ts",
            "test/reader-csp.test.ts",
          ],
          name: "browser",
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          setupFiles: ["test/setup-reader-subviews.ts"],
          exclude: [
            "test/app.test.ts",
            "test/docs-head.test.ts",
            "test/overlay.test.ts",
            "test/reader-csp.test.ts",
          ],
          include: ["test/**/*.test.ts"],
          name: "server",
        },
      },
    ],
  },
});
