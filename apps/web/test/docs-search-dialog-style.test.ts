// @effect-diagnostics nodeBuiltinImport:off -- The rule under test is the source of the StyleX recipe, so the test reads that file as bytes.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";

const recipePath = new URL(
  "../src/features/docs-search.stylex.ts",
  import.meta.url
);

const recipeSource = (): string => readFileSync(recipePath, "utf-8");

const styleBlock = (source: string, name: string): string => {
  const start = source.indexOf(`\n  ${name}: {`);

  if (start === -1) {
    return "";
  }

  const rest = source.slice(start + 1);
  const end = rest.indexOf("\n  },");

  return end === -1 ? rest : rest.slice(0, end);
};

const declaresDisplay = (source: string, name: string): boolean =>
  styleBlock(source, name).includes("display:");

describe("docs search dialog visibility", () => {
  it("leaves the closed dialog's display to the browser", () => {
    const source = recipeSource();

    expect(declaresDisplay(source, "panel")).toBe(false);
    expect(declaresDisplay(source, "panelFrame")).toBe(true);
  });

  it("reads a display from the named recipe block only", () => {
    const source = [
      "export const docsSearch = stylex.create({",
      "  panel: {",
      '    backgroundColor: "black",',
      "  },",
      "  panelFrame: {",
      '    display: "flex",',
      "  },",
      "});",
    ].join("\n");

    expect(declaresDisplay(source, "panel")).toBe(false);
    expect(declaresDisplay(source, "panelFrame")).toBe(true);
    expect(declaresDisplay(source, "missing")).toBe(false);
  });
});
