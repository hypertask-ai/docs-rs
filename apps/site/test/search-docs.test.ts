import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Schema } from "effect";

import { emitAssets } from "../scripts/emit-assets.ts";
import { searchDocs } from "../src/capabilities/search-docs.js";
import { buildDocsSearchIndex } from "../src/docs-search-index.js";
import {
  DocsSearchStore,
  docsSearchIndexPath,
} from "../src/docs-search-store.js";
import { nodeAssetsForGeneration } from "../src/node-content.js";

const index = buildDocsSearchIndex([
  {
    bodyMarkdown: "Turbopuffer upserts keep the search index fresh.",
    routePath: "/changelog/turbopuffer-upserts",
    title: "Turbopuffer upserts",
  },
  {
    bodyMarkdown: "Boards show the same task in every view you open.",
    routePath: "/features/boards",
    title: "Boards",
  },
]);

const makeStore = Effect.fn("makeDocsSearchStore")(function* makeStore() {
  const fs = yield* FileSystem.FileSystem;
  const directory = yield* fs.makeTempDirectoryScoped();

  const data = yield* Schema.decodeUnknownEffect(
    Schema.Array(Schema.Struct({ path: Schema.String, value: Schema.Json }))
  )([{ path: docsSearchIndexPath, value: index }]);

  const manifest = yield* emitAssets({
    data,
    directory,
    images: [],
    pages: [],
  });

  return yield* DocsSearchStore.layerForGeneration(manifest.generation).pipe(
    Layer.provide(nodeAssetsForGeneration(directory, manifest.generation)),
    Layer.build
  );
});

it.effect("searchDocs returns docs pages for a word in a page title", () =>
  Effect.gen(function* searchDocsPages() {
    const layer = yield* makeStore();

    const result = yield* searchDocs
      .handler({ query: "turbopuffer" })
      .pipe(Effect.provide(layer));

    expect(result.total).toBe(1);
    expect(result.matches[0]?.routePath).toBe("/changelog/turbopuffer-upserts");
    expect(result.matches[0]?.title).toBe("Turbopuffer upserts");
    expect(result.matches[0]?.excerpt).not.toBe("");
  }).pipe(Effect.provide(NodeServices.layer))
);

it.effect("searchDocs finds body words and returns no matches for noise", () =>
  Effect.gen(function* searchDocsBody() {
    const layer = yield* makeStore();

    const body = yield* searchDocs
      .handler({ query: "view" })
      .pipe(Effect.provide(layer));

    const noise = yield* searchDocs
      .handler({ query: "zzzznotaword" })
      .pipe(Effect.provide(layer));

    expect(body.matches.map((match) => match.routePath)).toEqual([
      "/features/boards",
    ]);
    expect(noise.total).toBe(0);
    expect(noise.matches).toEqual([]);
  }).pipe(Effect.provide(NodeServices.layer))
);
