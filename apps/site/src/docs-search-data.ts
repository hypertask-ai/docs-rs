import { Schema } from "effect";

export const DocsSearchSection = Schema.Struct({
  anchor: Schema.String,
  text: Schema.String,
  title: Schema.String,
});

export const DocsSearchPage = Schema.Struct({
  body: Schema.String,
  routePath: Schema.String,
  sections: Schema.Array(DocsSearchSection),
  terms: Schema.Record(Schema.String, Schema.Finite),
  title: Schema.String,
  titleTerms: Schema.Array(Schema.String),
  wordCount: Schema.Finite,
});

export const DocsSearchIndex = Schema.Struct({
  averagePageLength: Schema.Finite,
  pageCount: Schema.Finite,
  pages: Schema.Array(DocsSearchPage),
  version: Schema.Literal(1),
});

export type DocsSearchIndexData = typeof DocsSearchIndex.Type;

export type DocsSearchPageData = typeof DocsSearchPage.Type;
