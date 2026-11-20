import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "skills/security-audit/**",
    "src/content/changelog/**",
  ],
  overrides: [
    {
      files: ["apps/web/test/fixtures/content-migration/*.md"],
      options: { proseWrap: "preserve" },
    },
  ],
});
