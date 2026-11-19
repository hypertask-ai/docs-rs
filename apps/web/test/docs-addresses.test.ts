import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Schema } from "effect";

import {
  docsAddressAnswer,
  docsBareAddress,
  docsHtmlHandling,
  docsMarkdownAddress,
  docsNotFound,
  docsNotFoundPage,
  docsPageSet,
  docsRedirectLines,
  docsRedirects,
  docsRedirectsFile,
  docsSitemapFiles,
  docsSitemapIndexXml,
  docsSitemapPath,
  docsSitemapXml,
  docsTrailingSlashAddress,
} from "../src/docs-addresses.js";

const OldAddresses = Schema.Struct({
  capturedAt: Schema.String,
  markdown: Schema.Array(Schema.String),
  notFound: Schema.Struct({
    heading: Schema.String,
    message: Schema.String,
    status: Schema.Int,
    title: Schema.String,
  }),
  origin: Schema.String,
  pages: Schema.Array(Schema.String),
  redirects: Schema.Array(
    Schema.Struct({
      destination: Schema.String,
      oldMechanism: Schema.String,
      oldStatus: Schema.Int,
      source: Schema.String,
    })
  ),
  sitemap: Schema.Struct({
    files: Schema.Array(Schema.String),
    index: Schema.String,
    sha256: Schema.String,
    urlCount: Schema.Int,
  }),
  source: Schema.Struct({
    changelogRoot: Schema.String,
    commit: Schema.String,
    docsRoot: Schema.String,
    legacyChangelogSource: Schema.String,
    repo: Schema.String,
  }),
});

const oldAddresses = Effect.gen(function* oldAddresses() {
  const fs = yield* FileSystem.FileSystem;

  const source = yield* fs.readFileString(
    new URL("fixtures/docs-addresses/old-addresses.json", import.meta.url)
      .pathname
  );

  return yield* Schema.decodeEffect(Schema.fromJsonString(OldAddresses))(
    source
  );
});

const redirectedAddresses = new Set(
  docsRedirects.map((rule) => docsTrailingSlashAddress(rule.source))
);

const isSlashRouted = (path: string) =>
  path !== "/" &&
  !redirectedAddresses.has(path) &&
  !redirectedAddresses.has(docsBareAddress(path));

it.layer(NodeServices.layer)("docs addresses", (test) => {
  test.effect(
    "every old page address answers at the same trailing slash address",
    () =>
      Effect.gen(function* pageAddresses() {
        const { pages } = yield* oldAddresses;
        const known = docsPageSet(pages);

        expect(pages.length).toBe(695);
        expect(pages.every((path) => path.endsWith("/"))).toBe(true);

        for (const path of pages) {
          if (redirectedAddresses.has(path)) {
            continue;
          }

          expect(docsAddressAnswer(known, path)).toEqual({
            kind: "page",
            path,
          });
        }
      })
  );

  test.effect(
    "every old page address without its trailing slash redirects to the slash address",
    () =>
      Effect.gen(function* slashAddresses() {
        const { pages } = yield* oldAddresses;
        const known = docsPageSet(pages);

        for (const path of pages) {
          if (!isSlashRouted(path)) {
            continue;
          }

          expect(docsAddressAnswer(known, docsBareAddress(path))).toEqual({
            kind: "redirect",
            location: path,
            status: 308,
          });
        }
      })
  );

  test.effect(
    "every old markdown address answers as the same markdown file",
    () =>
      Effect.gen(function* markdownAddresses() {
        const { markdown, pages } = yield* oldAddresses;
        const known = docsPageSet(pages);

        expect(markdown.length).toBe(695);
        expect(markdown.toSorted()).toEqual(
          pages.map(docsMarkdownAddress).toSorted()
        );

        for (const path of markdown) {
          expect(docsAddressAnswer(known, path)).toEqual({
            kind: "markdown",
            path,
          });
        }
      })
  );

  test.effect("the old desktop redirect still lands on the apps page", () =>
    Effect.gen(function* desktopRedirect() {
      const { pages, redirects } = yield* oldAddresses;
      const known = docsPageSet(pages);

      expect(redirects).toEqual([
        {
          destination: "/getting-started/apps/",
          oldMechanism: "meta-refresh",
          oldStatus: 200,
          source: "/features/desktop",
        },
      ]);

      for (const address of [
        "/features/desktop",
        "/features/desktop/",
      ] as const) {
        expect(docsAddressAnswer(known, address)).toEqual({
          kind: "redirect",
          location: "/getting-started/apps/",
          status: 308,
        });
      }
    })
  );

  test.effect(
    "an address outside the old site answers with the old 404 words",
    () =>
      Effect.gen(function* notFoundAddress() {
        const { notFound, pages } = yield* oldAddresses;
        const known = docsPageSet(pages);
        const unknown = "/not-a-docs-page";

        expect(notFound.status).toBe(404);

        for (const address of [unknown, `${unknown}/`]) {
          expect(docsAddressAnswer(known, address)).toEqual({
            code: 404,
            kind: "notFound",
            path: address,
          });
        }

        const page = docsNotFoundPage(unknown);

        expect(page.code).toBe(404);
        expect(page.message).toBe(notFound.message);
        expect(docsNotFound.message).toBe(notFound.message);
      })
  );

  test.effect("the sitemap files list the same pages as the old site", () =>
    Effect.gen(function* sitemapFiles() {
      const { origin, pages, sitemap } = yield* oldAddresses;

      expect(docsSitemapFiles).toEqual([sitemap.index, ...sitemap.files]);

      expect(docsSitemapIndexXml(origin)).toContain(
        `<loc>${origin}${docsSitemapPath}</loc>`
      );

      const locations = [
        ...docsSitemapXml(origin, pages).matchAll(
          /<loc>(?<location>[^<]+)<\/loc>/gu
        ),
      ].map((match) => match.groups?.location);

      expect(sitemap.urlCount).toBe(695);
      expect(locations).toEqual(pages.map((path) => `${origin}${path}`));
    })
  );

  test.effect(
    "the built redirects file keeps the slash address and the old redirect",
    () =>
      Effect.gen(function* redirectsFile() {
        const { pages } = yield* oldAddresses;
        const known = docsPageSet(pages);
        const lines = docsRedirectLines(pages);

        expect(lines).toContain("/features/desktop /getting-started/apps/ 308");
        expect(lines).toContain(
          "/features/desktop/ /getting-started/apps/ 308"
        );

        for (const path of pages) {
          if (!isSlashRouted(path)) {
            continue;
          }

          expect(lines).toContain(`${docsBareAddress(path)} ${path} 308`);
        }

        expect(docsRedirectsFile(pages).endsWith("\n")).toBe(true);

        for (const line of lines) {
          const [source, destination, status] = line.split(" ");

          if (source === undefined || destination === undefined) {
            continue;
          }

          if (!isSlashRouted(docsTrailingSlashAddress(source))) {
            continue;
          }

          expect(status).toBe("308");
          expect(known.has(docsBareAddress(source))).toBe(true);
          expect(destination).toBe(docsTrailingSlashAddress(source));
        }
      })
  );

  test.effect("the site keeps the slash form the old site answers with", () =>
    Effect.sync(() => {
      expect(docsHtmlHandling).toBe("force-trailing-slash");
    })
  );
});
