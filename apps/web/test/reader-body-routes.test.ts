import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Context, Effect, Layer } from "effect";
import { renderToString } from "foldkit/experimental/server";

import {
  compileReaderBody,
  readerNewsTitle,
} from "../../site/scripts/reader-body-document.ts";
import {
  readerBodyFlags,
  readerCopyPrompts,
} from "../../site/scripts/reader-body-flags.ts";
import { prepareReaderSiteInputs } from "../../site/scripts/reader-site-inputs.ts";
import { isDocsPageRoute } from "../../site/src/docs-page-routes.ts";
import {
  docsHeaderAnchors,
  docsHeaderLinkedPaths,
  docsHeaderTabAnchors,
} from "../../site/test/reader-docs-header.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import { view } from "../src/features/reader-subviews-client.js";
import { readerBodyRoutePaths } from "../src/reader-routes.js";
import { normalizedNodes } from "./reader-node-normalize.js";

const make = Effect.gen(function* readerParityFixture() {
  const inputs = yield* prepareReaderSiteInputs;
  const flags = yield* readerBodyFlags("https://ratstack.sh");

  return { flags, inputs };
});

class ReaderParityFixture extends Context.Service<
  ReaderParityFixture,
  Effect.Success<typeof make>
>()("@hypertask-docs/web/test/ReaderParityFixture") {
  static readonly layer = Layer.effect(ReaderParityFixture, make).pipe(
    Layer.provide(NodeServices.layer)
  );
}

const parityTitle = (path: string) =>
  `ReaderSiteParity ${path}: keeps its complete human body, breadcrumb and metadata after Foldkit rendering`;

it.layer(ReaderParityFixture.layer)((test) => {
  test.effect("ReaderSiteParity: every body route has a rendered page", () =>
    Effect.gen(function* bodyRouteCoverage() {
      const { flags, inputs } = yield* ReaderParityFixture;

      const docs = inputs.pages
        .map((page) => page.path)
        .filter(isDocsPageRoute);

      expect(docs.length).toBeGreaterThan(0);
      expect(flags.map((page) => page.page.path).toSorted()).toEqual(
        [...readerBodyRoutePaths, ...docs].toSorted()
      );
    })
  );

  for (const path of readerBodyRoutePaths) {
    test.effect(parityTitle(path), () =>
      Effect.gen(function* pageParity() {
        const { flags, inputs } = yield* ReaderParityFixture;
        const page = flags.find((candidate) => candidate.page.path === path);

        const original = inputs.pages.find(
          (candidate) => candidate.path === path
        );

        expect(page).toBeDefined();
        expect(original).toBeDefined();

        if (page === undefined) {
          return;
        }

        const before = yield* compileReaderBody(
          original?.html.replaceAll("__RATSTACK_ORIGIN__", page.origin) ?? "",
          page.page.sourcePath,
          readerCopyPrompts(page.origin)
        );

        const rendered = yield* renderToString(
          { Flags: ReaderFlags, init, view },
          { flags: page, isHydratable: false }
        );

        const after = yield* compileReaderBody(
          rendered.html,
          page.page.sourcePath,
          readerCopyPrompts(page.origin)
        );

        expect(readerNewsTitle(rendered.html), path).toBe(
          readerNewsTitle(original?.html ?? "")
        );

        const headerAnchors = docsHeaderAnchors(rendered.html);
        const headerTabs = docsHeaderTabAnchors(path);
        const tabHrefs = new Set(headerTabs.map((tab) => tab.href));

        expect(
          headerAnchors.filter((anchor) => tabHrefs.has(anchor.href)),
          path
        ).toEqual(headerTabs);
        expect(
          headerAnchors.map((anchor) => anchor.href),
          path
        ).toEqual(expect.arrayContaining([...docsHeaderLinkedPaths]));
        expect(after.heading, path).toBe(before.heading);
        expect(after.breadcrumb, path).toEqual(before.breadcrumb);
        expect(normalizedNodes(after.nodes), path).toEqual(
          normalizedNodes(before.nodes)
        );
        expect(page.page.generation).toBe(inputs.generation);
        expect(page.page.metadata).toEqual(original?.metadata);
      }).pipe(Effect.provide(NodeServices.layer))
    );
  }
});
