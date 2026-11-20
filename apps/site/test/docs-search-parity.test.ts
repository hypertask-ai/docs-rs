// @effect-diagnostics nodeBuiltinImport:off -- The fixture is the old site's own page text and search results, read as bytes.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { buildDocsSearchIndex } from "../scripts/docs-search-index.ts";
import { docsPageSource } from "../scripts/docs-search-pages.ts";
import { searchDocsIndex } from "../src/docs-search.js";

const fixtureText = (name: string): string =>
  readFileSync(
    new URL(`fixtures/docs-search/${name}`, import.meta.url),
    "utf-8"
  );

const CorpusPage = Schema.Struct({
  markdown: Schema.String,
  routePath: Schema.String,
});

const QueryFixture = Schema.Struct({
  averagePageLength: Schema.Finite,
  pageCount: Schema.Finite,
  queries: Schema.Array(
    Schema.Struct({
      query: Schema.String,
      results: Schema.Array(
        Schema.Struct({
          routePath: Schema.String,
          score: Schema.Finite,
          title: Schema.String,
        })
      ),
      total: Schema.Finite,
    })
  ),
});

const corpus = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Array(CorpusPage))
)(fixtureText("corpus.json"));

const recorded = Schema.decodeUnknownSync(Schema.fromJsonString(QueryFixture))(
  fixtureText("queries.json")
);

const index = buildDocsSearchIndex(
  corpus.map((page) => {
    const source = docsPageSource("page.md", page.markdown);

    return {
      bodyMarkdown: source.bodyMarkdown,
      routePath: page.routePath,
      title: source.title,
    };
  })
);

const oldIndex = {
  ...index,
  averagePageLength: recorded.averagePageLength,
  pageCount: recorded.pageCount,
};

describe("docs search parity with the old docs site", () => {
  it("records the old index shape the ranking was calibrated against", () => {
    expect(recorded.pageCount).toBe(695);
    expect(recorded.queries.length).toBeGreaterThanOrEqual(20);
  });

  it("indexes every page in the fixture corpus", () => {
    expect(index.pageCount).toBe(corpus.length);
    expect(index.pages.map((page) => page.routePath).toSorted()).toEqual(
      corpus.map((page) => page.routePath).toSorted()
    );
  });

  for (const query of recorded.queries) {
    it(`finds the same pages in the same order for "${query.query}"`, () => {
      const result = searchDocsIndex(oldIndex, query.query, 5);

      expect(result.total).toBe(query.total);
      expect(result.matches.map((match) => match.routePath)).toEqual(
        query.results.map((entry) => entry.routePath)
      );
      expect(result.matches.map((match) => match.title)).toEqual(
        query.results.map((entry) => entry.title)
      );
      expect(result.matches.every((match) => match.excerpt !== "")).toBe(true);
    });
  }
});
