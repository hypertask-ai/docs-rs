// @effect-diagnostics-next-line nodeBuiltinImport:off -- The docs end fixtures are committed next to the test and read once at module evaluation.
import { readdirSync, readFileSync } from "node:fs";

import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { renderToString } from "foldkit/experimental/server";

import {
  docsContentsItems,
  docsFooterText,
  docsPaginationItems,
} from "../../site/test/docs-page-end-items.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import type { ReaderPageFlags } from "../src/client/reader/model.js";
import { docsNormalizedPath } from "../src/features/docs-page-order.js";
import { view } from "../src/features/reader.js";
import { readerFlagsFixture } from "./reader-fixture.js";

const DocsEndFixture = Schema.Struct({
  contents: Schema.Array(
    Schema.Struct({ href: Schema.String, text: Schema.String })
  ),
  footerText: Schema.String,
  kind: Schema.String,
  pagination: Schema.Array(
    Schema.Struct({
      href: Schema.String,
      label: Schema.String,
      rel: Schema.String,
      text: Schema.String,
    })
  ),
  path: Schema.String,
  title: Schema.String,
  url: Schema.String,
});

type DocsEndFixture = typeof DocsEndFixture.Type;

const fixtureDirectory = new URL("fixtures/docs-page-end/", import.meta.url);

const fixtures: readonly DocsEndFixture[] = readdirSync(fixtureDirectory)
  .filter((file) => file.endsWith(".json"))
  .toSorted()
  .map((file) =>
    Schema.decodeUnknownSync(Schema.fromJsonString(DocsEndFixture))(
      readFileSync(new URL(file, fixtureDirectory), "utf-8")
    )
  );

const docsFlags = (fixture: DocsEndFixture): ReaderPageFlags => ({
  ...readerFlagsFixture,
  blocks: [],
  bodyNodes: Option.none(),
  heading: fixture.title,
  page: {
    ...readerFlagsFixture.page,
    metadata: {
      ...readerFlagsFixture.page.metadata,
      canonicalPath: fixture.path,
      title: `${fixture.title} | Hypertask Docs`,
    },
    path: docsNormalizedPath(fixture.path),
  },
  references: Option.some({
    anchors: fixture.contents.slice(1).map((row) => ({
      id: row.href.replace(/^#/u, ""),
      text: row.text,
    })),
    backlinks: [],
    inboundCounts: {},
  }),
});

const renderDocsPage = (fixture: DocsEndFixture) =>
  Effect.gen(function* renderPage() {
    const rendered = yield* renderToString(
      { Flags: ReaderFlags, init, view },
      { flags: docsFlags(fixture), isHydratable: false }
    );

    return rendered.html;
  }).pipe(Effect.provide(NodeServices.layer));

for (const fixture of fixtures) {
  it.effect(
    `DocsPageEnd ${fixture.kind}: the contents list, previous and next, and the footer match ${fixture.url}`,
    () =>
      Effect.gen(function* pageEnd() {
        const html = yield* renderDocsPage(fixture);

        const contents = docsContentsItems(html);

        expect(
          contents.map(({ href, text }) => ({ href, text })),
          "contents rows in order with their targets"
        ).toEqual(fixture.contents);

        expect(
          contents.filter((item) => item.current).map((item) => item.href),
          "the first contents row is the current one on a static page"
        ).toEqual(
          fixture.contents.length === 0 ? [] : [fixture.contents[0]?.href]
        );

        expect(
          docsPaginationItems(html),
          "previous and next labels, targets and order"
        ).toEqual(fixture.pagination);

        expect(docsFooterText(html)).toBe(fixture.footerText);

        if (fixture.pagination.length > 0) {
          expect(html.indexOf("docs-pagination")).toBeGreaterThan(-1);
          expect(html.indexOf("docs-pagination")).toBeLessThan(
            html.indexOf("docs-footer-note")
          );
        }
      })
  );
}
