import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Schema,
} from "effect";
import { renderToString } from "foldkit/experimental/server";
import { inertHtml } from "foldkit/html";

import { readerBodyFlags } from "../../site/scripts/reader-body-flags.ts";
import { readerHomeFlags } from "../../site/scripts/reader-home-flags.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import type { ReaderPageFlags } from "../src/client/reader/model.js";
import { view, viewAt } from "../src/features/reader.js";
import { readerMetadataHead } from "../src/reader-metadata.js";
import {
  renderDocument,
  withReaderHead,
} from "../src/server/reader-document.js";
import {
  addSiteBasePath,
  normalizeSiteBasePath,
  removeSiteBasePath,
} from "../src/site-base-path.js";
import { siteBuilder } from "../src/site-base.js";

const origin = "https://docs.hypertask.ai";

const RouteSegments = Schema.Array(
  Schema.Literals([
    "agents",
    "api",
    "byok",
    "features",
    "getting-started",
    "lore",
    "mcp",
    "systems",
  ])
);

it.prop(
  "a route survives the site base path on the way in and on the way out",
  { basePath: Schema.Literals(["", "/ratstack"]), segments: RouteSegments },
  ({ basePath, segments }) => {
    const route = `/${segments.join("/")}`;
    const atSiteBase = addSiteBasePath(basePath, route);

    expect(atSiteBase).toStrictEqual(addSiteBasePath(basePath, atSiteBase));
    expect(removeSiteBasePath(basePath, atSiteBase)).toStrictEqual(route);
    expect(atSiteBase.startsWith("/ratstack")).toStrictEqual(basePath !== "");
  }
);

it("leaves external addresses and in-page references alone", () => {
  for (const path of [
    "#contents",
    "?q=search",
    "//cdn.hypertask.ai/app.js",
    "https://app.hypertask.ai",
    "mailto:help@hypertask.ai",
  ]) {
    expect(addSiteBasePath("/ratstack", path)).toStrictEqual(path);
  }
});

it("normalizes the setting to one root-relative path", () => {
  expect(normalizeSiteBasePath()).toStrictEqual("");
  expect(normalizeSiteBasePath(" / ")).toStrictEqual("");
  expect(normalizeSiteBasePath("/ratstack/")).toStrictEqual("/ratstack");
  expect(normalizeSiteBasePath("/docs/ratstack")).toStrictEqual(
    "/docs/ratstack"
  );
  expect(() => normalizeSiteBasePath("ratstack")).toThrow();
  expect(() =>
    normalizeSiteBasePath("https://docs.hypertask.ai/ratstack")
  ).toThrow();
});

it("prefixes every source in one srcset and keeps its descriptors", () => {
  expect(
    siteBuilder("/ratstack", inertHtml).Attribute(
      "srcset",
      "/og/a.png 1x, /og/b.png 2x"
    )
  ).toStrictEqual(
    inertHtml.Attribute(
      "srcset",
      "/ratstack/og/a.png 1x, /ratstack/og/b.png 2x"
    )
  );
});

it("keeps the builder untouched when the site mounts at the origin root", () => {
  expect(siteBuilder("", inertHtml).Href("/lore/example")).toStrictEqual(
    inertHtml.Href("/lore/example")
  );
});

it("prefixes every internal address the builder writes", () => {
  const atSiteBase = siteBuilder("/ratstack", inertHtml);

  expect(atSiteBase.Href("/lore/example").value).toStrictEqual(
    "/ratstack/lore/example"
  );
  expect(atSiteBase.Src("/og/home.png").value).toStrictEqual(
    "/ratstack/og/home.png"
  );
  expect(atSiteBase.Attribute("href", "/systems/docs")).toStrictEqual(
    inertHtml.Attribute("href", "/ratstack/systems/docs")
  );
  expect(atSiteBase.Href("https://app.hypertask.ai")).toStrictEqual(
    inertHtml.Href("https://app.hypertask.ai")
  );
});

it("keeps the canonical on the old public address and marks a prefixed page noindex", () => {
  const head = readerMetadataHead(
    {
      canonicalPath: "/lore/example",
      description: "One lore page.",
      discoveryLinks: [
        {
          href: "/lore/example.md",
          rel: "alternate",
          type: "text/markdown",
        },
      ],
      jsonLd: "TechArticle",
      ogImagePath: "/og/lore/example.png",
      robots: "index",
      title: "Example | docs",
    },
    origin,
    "/ratstack"
  );

  expect(head).toContain('name="robots" content="noindex, nofollow"');
  expect(head).toContain(`${origin}/lore/example`);
  expect(head).toContain(`content="${origin}/ratstack/og/lore/example.png"`);
  expect(head).toContain('href="/ratstack/lore/example.md"');
});

const make = Effect.gen(function* readerSiteBaseFixture() {
  const bodies = yield* readerBodyFlags(origin);

  const homeCandidate = yield* readerHomeFlags(origin);

  const decodedHome =
    homeCandidate === null
      ? undefined
      : yield* Schema.decodeUnknownEffect(ReaderFlags)(homeCandidate);

  const home = yield* Option.match(
    Option.fromNullishOr(
      decodedHome ?? bodies.find((page) => page.page.path === "/")
    ),
    {
      onNone: () =>
        Effect.die(
          new Error(
            "The reader build has no home page flags, so the site base path test has no home page to check"
          )
        ),
      onSome: Effect.succeed,
    }
  );

  const deepPage =
    bodies.find(
      (page) => page.page.path === "/getting-started/introduction/"
    ) ?? bodies.find((page) => page.page.path === "/AGENTS.md");

  const deep = yield* Option.match(Option.fromNullishOr(deepPage), {
    onNone: () =>
      Effect.die(
        new Error(
          "The reader build has no deep docs page, so the site base path has no deep page to check"
        )
      ),
    onSome: Effect.succeed,
  });

  return { deep, home };
});

class ReaderSiteBaseFixture extends Context.Service<
  ReaderSiteBaseFixture,
  Effect.Success<typeof make>
>()("@rat-stack/web/test/ReaderSiteBaseFixture") {
  static readonly layer = Layer.effect(ReaderSiteBaseFixture, make).pipe(
    Layer.provide(NodeServices.layer)
  );
}

const pageDocument = (flags: ReaderPageFlags, basePath: string) =>
  Effect.gen(function* renderPageDocument() {
    const application = yield* renderToString(
      { Flags: ReaderFlags, init, view: viewAt(basePath) },
      { flags, isHydratable: false }
    );

    return renderDocument(withReaderHead(application, flags, basePath), {
      entryScript: addSiteBasePath(basePath, "/assets/entry.js"),
      modulePreloads: [],
      stylesheets: [addSiteBasePath(basePath, "/assets/entry.css")],
    });
  });

const canonicalHref = (html: string): string | undefined =>
  /<link [^>]*rel="canonical"[^>]*href="(?<href>[^"]*)"/u.exec(html)?.groups
    ?.href;

const internalAddresses = (html: string): readonly string[] =>
  [...html.matchAll(/\s(?:href|src)="(?<value>[^"]*)"/gu)].flatMap((match) => {
    const value = match.groups?.value ?? "";

    return value.startsWith("/") ? [value] : [];
  });

const escapesSiteBasePath = (html: string): boolean =>
  internalAddresses(html).some((address) => address.startsWith("/ratstack/"));

it.layer(ReaderSiteBaseFixture.layer)((test) => {
  test.effect(
    "the home page and a deep page keep every internal address under the site base path",
    () =>
      Effect.gen(function* prefixedPages() {
        const { deep, home } = yield* ReaderSiteBaseFixture;

        for (const flags of [home, deep]) {
          const html = yield* pageDocument(flags, "/ratstack");
          const addresses = internalAddresses(html);

          expect(addresses.length).toBeGreaterThan(0);

          for (const address of addresses) {
            expect(address.startsWith("/ratstack/")).toStrictEqual(true);
          }

          expect(html).toContain('name="robots" content="noindex, nofollow"');
          expect(canonicalHref(html)).toStrictEqual(
            `${origin}${flags.page.metadata.canonicalPath}`
          );
        }
      })
  );

  test.effect(
    "an empty site base path leaves the home page and a deep page byte for byte as they are",
    () =>
      Effect.gen(function* unprefixedPages() {
        const { deep, home } = yield* ReaderSiteBaseFixture;

        for (const flags of [home, deep]) {
          const rendered = yield* renderToString(
            { Flags: ReaderFlags, init, view },
            { flags, isHydratable: false }
          );

          const atOriginRoot = yield* renderToString(
            { Flags: ReaderFlags, init, view: viewAt("") },
            { flags, isHydratable: false }
          );

          expect(atOriginRoot.html).toStrictEqual(rendered.html);
          expect(escapesSiteBasePath(yield* pageDocument(flags, ""))).toBe(
            false
          );
        }
      })
  );
});

it.layer(NodeServices.layer)((test) => {
  test.effect(
    "today's built home page and deep page carry no site base path",
    () =>
      Effect.gen(function* builtPages() {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        for (const page of [
          "dist/client/index.html",
          "dist/client/AGENTS.md/index.html",
        ]) {
          const html = yield* fs.readFileString(
            path.resolve(import.meta.dirname, "..", page)
          );

          expect(escapesSiteBasePath(html)).toBe(false);
          expect(internalAddresses(html).length).toBeGreaterThan(0);
        }
      })
  );
});
