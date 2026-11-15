import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { readDocsSearchPages } from "../scripts/docs-search-pages.js";
import {
  buildDocsSearchIndex,
  buildDocsSearchPage,
} from "../src/docs-search-index.js";
import { searchDocsIndex } from "../src/docs-search.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));

const page = {
  bodyMarkdown: `# Turbopuffer upserts

Text about turbopuffer once.

## Filter

Another turbopuffer line.
`,
  routePath: "/changelog/turbopuffer",
  title: "Turbopuffer upserts",
};

describe("docs search index", () => {
  it("weights the page title above headings and body words", () => {
    const built = buildDocsSearchPage(page);

    expect(built.terms.turbopuffer).toBe(7 + 7 + 1 + 1);
    expect(built.terms.upsert).toBe(7 + 7);
    expect(built.terms.filter).toBe(6);
    expect(built.titleTerms).toEqual(["turbopuffer", "upsert"]);
  });

  it("keeps one section per heading for sub results", () => {
    const built = buildDocsSearchPage(page);

    expect(built.sections.map((section) => section.title)).toEqual([
      "Turbopuffer upserts",
      "Filter",
    ]);
    expect(built.sections[1]?.anchor).toBe("filter");
    expect(built.sections[1]?.text).toBe("Another turbopuffer line.");
  });

  it("counts source words, not compound parts", () => {
    const built = buildDocsSearchPage({
      bodyMarkdown: "AI-native boards and agent-ready webhooks.",
      routePath: "/features/boards",
      title: "Boards",
    });

    expect(built.wordCount).toBe(6);
    expect(built.terms["ai-native"]).toBeUndefined();
    expect(built.terms.ai).toBeGreaterThan(0);
    expect(built.terms.native).toBeGreaterThan(0);
  });

  it("declares the corpus size and average page length", () => {
    const index = buildDocsSearchIndex([
      page,
      { ...page, routePath: "/other" },
    ]);

    expect(index.pageCount).toBe(2);
    expect(index.averagePageLength).toBeGreaterThan(0);
    expect(buildDocsSearchIndex([]).pageCount).toBe(0);
  });

  it("returns nothing for an empty query or an unknown word", () => {
    const index = buildDocsSearchIndex([page]);

    expect(searchDocsIndex(index, "  ").total).toBe(0);
    expect(searchDocsIndex(index, "zzzznotaword").total).toBe(0);
    expect(searchDocsIndex(index, "turbopuffer").total).toBe(1);
  });

  it.effect("indexes every docs page that exists on this branch", () =>
    Effect.gen(function* indexEveryDocsPage() {
      const pages = yield* readDocsSearchPages(root).pipe(
        Effect.provide(NodeServices.layer)
      );

      const index = buildDocsSearchIndex(pages);

      expect(index.pageCount).toBe(pages.length);
      expect(index.pages.map((built) => built.routePath).toSorted()).toEqual(
        pages.map((source) => source.routePath).toSorted()
      );

      for (const source of pages) {
        expect(searchDocsIndex(index, source.title, 1).total).toBeGreaterThan(
          0
        );
      }
    })
  );
});
