// @effect-diagnostics nodeBuiltinImport:off -- The fixtures are the live site's own head, read as bytes.

import { readFileSync } from "node:fs";

import { expect, it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { renderToString } from "foldkit/experimental/server";

import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import type { ReaderPageFlags } from "../src/client/reader/model.js";
import {
  docsHead,
  docsPageKind,
  docsPageTitleFromDocumentTitle,
} from "../src/docs-head.js";
import type { DocsHead } from "../src/docs-head.js";
import { view } from "../src/features/reader.js";
import { escapeAttribute } from "../src/reader-metadata.js";
import {
  renderDocument,
  withReaderHead,
} from "../src/server/reader-document.js";
import { readerFlagsFixture } from "./reader-fixture.js";

const origin = "https://docs.hypertask.ai";

const DocsPageKindSchema = Schema.Literals([
  "changelog-entry",
  "changelog-index",
  "home",
  "not-found",
  "page",
  "search",
]);

const FixturePage = Schema.Struct({
  description: Schema.optional(Schema.String),
  file: Schema.String,
  kind: DocsPageKindSchema,
  lang: Schema.String,
  pageTitle: Schema.String,
  path: Schema.String,
  status: Schema.Int,
});

const fixtureDirectory = new URL("fixtures/docs-head/", import.meta.url);

const readFixture = (file: string): string =>
  readFileSync(new URL(file, fixtureDirectory), "utf-8");

const pages = Schema.decodeSync(
  Schema.fromJsonString(Schema.Array(FixturePage))
)(readFixture("pages.json"));

const seoMetaNames = new Set([
  "application-name",
  "description",
  "generator",
  "manifest",
  "robots",
  "theme-color",
  "twitter:card",
  "twitter:creator",
  "twitter:description",
  "twitter:image",
  "twitter:site",
  "twitter:title",
]);

const seoLinkRels = new Set([
  "alternate",
  "apple-touch-icon",
  "canonical",
  "icon",
  "manifest",
  "shortcut icon",
  "sitemap",
]);

const tagText = (element: Element): string => {
  const attributes = [...element.attributes]
    .map((attribute) => `${attribute.name}=${attribute.value}`)
    .toSorted()
    .join(" ");

  return `${element.tagName.toLowerCase()} ${attributes}`.trim();
};

const headTags = (html: string): readonly string[] => {
  const parsed = new DOMParser().parseFromString(
    `<html><head>${html}</head><body></body></html>`,
    "text/html"
  );

  const tags = [...parsed.head.querySelectorAll("title")].map(
    (element) => `title ${element.textContent ?? ""}`
  );

  for (const element of parsed.head.querySelectorAll("meta")) {
    const name = element.getAttribute("name") ?? "";
    const property = element.getAttribute("property") ?? "";

    if (property.startsWith("og:") || seoMetaNames.has(name)) {
      tags.push(tagText(element));
    }
  }

  for (const element of parsed.head.querySelectorAll("link")) {
    const rel = element.getAttribute("rel") ?? "";

    if (seoLinkRels.has(rel)) {
      tags.push(tagText(element));
    }
  }

  for (const element of parsed.head.querySelectorAll(
    'script[type="application/ld+json"]'
  )) {
    tags.push(tagText(element));
  }

  return tags;
};

const tableTags = (tags: readonly string[]): readonly string[] =>
  tags.filter((tag) => !tag.endsWith(" name=generator"));

const builtHead = (head: DocsHead): string =>
  [
    `<title>${escapeAttribute(head.title)}</title>`,
    `<link rel="canonical" href="${escapeAttribute(head.canonical)}">`,
    `<meta property="og:url" content="${escapeAttribute(head.ogUrl)}">`,
    head.tags,
  ].join("\n");

interface PageInput {
  readonly description: string | undefined;
  readonly pageTitle: string;
  readonly path: string;
  readonly status: number;
}

const docsHeadFor = (page: PageInput): DocsHead =>
  Option.getOrThrow(
    docsHead({
      description: page.description,
      noindex: false,
      origin,
      pageTitle: page.pageTitle,
      path: page.path,
      status: page.status,
    })
  );

for (const page of pages) {
  it(`keeps the recorded head at ${page.path}`, () => {
    const head = docsHeadFor(page);
    const recorded = readFixture(page.file);

    expect(docsPageKind(page)).toBe(page.kind);
    expect(
      docsPageTitleFromDocumentTitle(`${page.pageTitle} | Hypertask Docs`)
    ).toBe(page.pageTitle);
    expect(head.lang).toBe(page.lang);
    expect(tableTags(headTags(builtHead(head))).toSorted()).toStrictEqual(
      tableTags(headTags(recorded)).toSorted()
    );
  });
}

it("drops only the two build-tool generator tags that the live head carries", () => {
  const generators = pages.flatMap((page) =>
    headTags(readFixture(page.file)).filter((tag) =>
      tag.endsWith(" name=generator")
    )
  );

  expect([...new Set(generators)].toSorted()).toStrictEqual([
    "meta content=Astro v6.1.8 name=generator",
    "meta content=Starlight v0.38.3 name=generator",
  ]);
});

it("serves no share image, twitter text, structured data, theme colour or manifest", () => {
  for (const page of pages) {
    const head = docsHeadFor(page);

    expect(head.tags).not.toContain("og:image");
    expect(head.tags).not.toContain("twitter:image");
    expect(head.tags).not.toContain("twitter:title");
    expect(head.tags).not.toContain("twitter:description");
    expect(head.tags).not.toContain("ld+json");
    expect(head.tags).not.toContain("theme-color");
    expect(head.tags).not.toContain("manifest");
  }
});

const flagsFor = (input: {
  readonly canonicalPath: string;
  readonly description: string;
  readonly jsonLd: "TechArticle" | "WebSite" | "none";
  readonly ogImagePath: string;
  readonly path: string;
  readonly robots: "index" | "noindex";
  readonly status: number;
  readonly title: string;
}): ReaderPageFlags => ({
  ...readerFlagsFixture,
  heading: "Docs page",
  origin,
  page: {
    ...readerFlagsFixture.page,
    metadata: {
      ...readerFlagsFixture.page.metadata,
      canonicalPath: input.canonicalPath,
      description: input.description,
      jsonLd: input.jsonLd,
      ogImagePath: input.ogImagePath,
      robots: input.robots,
      title: input.title,
    },
    path: input.path,
    status: input.status,
  },
});

const builtDocument = (flags: ReaderPageFlags) =>
  Effect.gen(function* builtReaderDocument() {
    const rendered = yield* renderToString(
      { Flags: ReaderFlags, init, view },
      { flags, isHydratable: false }
    );

    return renderDocument(withReaderHead(rendered, flags), {
      entryScript: "/assets/reader.js",
      modulePreloads: [],
      stylesheets: [],
    });
  });

const parsedDocument = (html: string): Document =>
  new DOMParser().parseFromString(html, "text/html");

const contents = (parsed: Document, selector: string): readonly string[] =>
  [...parsed.head.querySelectorAll(selector)].map(
    (element) => element.getAttribute("content") ?? ""
  );

it.effect(
  "renders a docs page head once, with the description in the document layer",
  () =>
    Effect.gen(function* docsPageHead() {
      const flags = flagsFor({
        canonicalPath: "/features/boards",
        description: "Organize work with Kanban-style boards.",
        jsonLd: "none",
        ogImagePath: "/og/features-boards.png",
        path: "/features/boards",
        robots: "index",
        status: 200,
        title: "Boards & Sections | Hypertask Docs",
      });

      const parsed = parsedDocument(yield* builtDocument(flags));
      const canonical = `${origin}/features/boards/`;

      expect(parsed.title).toBe("Boards & Sections | Hypertask Docs");
      expect(parsed.documentElement.lang).toBe("en");
      expect(
        [...parsed.head.querySelectorAll('link[rel="canonical"]')].map(
          (element) => element.getAttribute("href")
        )
      ).toStrictEqual([canonical]);
      expect(contents(parsed, 'meta[property="og:url"]')).toStrictEqual([
        canonical,
      ]);
      expect(contents(parsed, 'meta[property="og:title"]')).toStrictEqual([
        "Boards & Sections",
      ]);
      expect(contents(parsed, 'meta[name="description"]')).toStrictEqual([
        "Organize work with Kanban-style boards.",
      ]);
      expect(contents(parsed, 'meta[property="og:description"]')).toStrictEqual(
        ["Organize work with Kanban-style boards."]
      );
      expect(contents(parsed, 'meta[property="og:type"]')).toStrictEqual([
        "article",
      ]);
      expect(contents(parsed, 'meta[property="og:locale"]')).toStrictEqual([
        "en",
      ]);
      expect(contents(parsed, 'meta[property="og:site_name"]')).toStrictEqual([
        "Hypertask Docs",
      ]);
      expect(contents(parsed, 'meta[name="twitter:card"]')).toStrictEqual([
        "summary_large_image",
      ]);
      expect(contents(parsed, 'meta[property="og:image"]')).toStrictEqual([]);
      expect(contents(parsed, 'meta[name="robots"]')).toStrictEqual([]);
      expect(
        parsed.head.querySelectorAll('script[type="application/ld+json"]')
      ).toHaveLength(0);
      expect(
        [...parsed.head.querySelectorAll("link[rel='sitemap']")].map(
          (element) => element.getAttribute("href")
        )
      ).toStrictEqual(["/sitemap-index.xml"]);
      expect(
        [...parsed.head.querySelectorAll("link[rel='shortcut icon']")].map(
          (element) => element.getAttribute("href")
        )
      ).toStrictEqual(["/glyph-white.png"]);
      expect(parsed.head.querySelectorAll("link[rel='icon']")).toHaveLength(0);
      expect(
        [
          ...parsed.head.querySelectorAll(
            "title,link[rel='canonical'],meta[name='description']"
          ),
        ].map((element) => element.tagName.toLowerCase())
      ).toStrictEqual(["title", "link", "meta"]);
      expect(parsed.head.textContent).not.toContain("Astro v6.1.8");
    })
);

it.effect("renders the live 404 head at every missing address", () =>
  Effect.gen(function* notFoundHead() {
    const flags = flagsFor({
      canonicalPath: "/",
      description: "The page the reader asked for is not here.",
      jsonLd: "none",
      ogImagePath: "/og/home.png",
      path: "/missing-page",
      robots: "index",
      status: 404,
      title: "404 | rat-stack",
    });

    const parsed = parsedDocument(yield* builtDocument(flags));

    expect(parsed.title).toBe("404 | Hypertask Docs");
    expect(
      [...parsed.head.querySelectorAll('link[rel="canonical"]')].map(
        (element) => element.getAttribute("href")
      )
    ).toStrictEqual([`${origin}/404/`]);
    expect(contents(parsed, 'meta[property="og:url"]')).toStrictEqual([
      `${origin}/404/`,
    ]);
    expect(contents(parsed, 'meta[property="og:title"]')).toStrictEqual([
      "404",
    ]);
    expect(contents(parsed, 'meta[name="description"]')).toStrictEqual([]);
    expect(contents(parsed, 'meta[property="og:description"]')).toStrictEqual(
      []
    );
    expect(contents(parsed, 'meta[property="og:image"]')).toStrictEqual([]);
    expect(contents(parsed, 'meta[name="robots"]')).toStrictEqual([]);
  })
);

it.effect(
  "marks the search page noindex because the live site has no search page",
  () =>
    Effect.gen(function* searchHead() {
      const flags = flagsFor({
        canonicalPath: "/search",
        description: "Search rat-stack's rules, lore, skills, and prompts.",
        jsonLd: "none",
        ogImagePath: "/og/search.png",
        path: "/search",
        robots: "index",
        status: 200,
        title: "Search the docs | rat-stack",
      });

      const parsed = parsedDocument(yield* builtDocument(flags));

      expect(parsed.title).toBe("Search the docs | Hypertask Docs");
      expect(
        [...parsed.head.querySelectorAll('link[rel="canonical"]')].map(
          (element) => element.getAttribute("href")
        )
      ).toStrictEqual([`${origin}/search/`]);
      expect(contents(parsed, 'meta[name="robots"]')).toStrictEqual([
        "noindex",
      ]);
      expect(contents(parsed, 'meta[name="description"]')).toStrictEqual([]);
      expect(contents(parsed, 'meta[property="og:description"]')).toStrictEqual(
        []
      );
    })
);

it.effect(
  "keeps the Rat Stack template head on pages that are not docs pages",
  () =>
    Effect.gen(function* templateHead() {
      const flags = flagsFor({
        canonicalPath: "/lore/services-capture-dependencies",
        description: "A lore page on the template site.",
        jsonLd: "TechArticle",
        ogImagePath: "/og/lore.png",
        path: "/lore/services-capture-dependencies",
        robots: "index",
        status: 200,
        title: "Services capture dependencies | rat-stack",
      });

      const parsed = parsedDocument(yield* builtDocument(flags));

      expect(parsed.title).toBe("Services capture dependencies | rat-stack");
      expect(contents(parsed, 'meta[property="og:site_name"]')).toStrictEqual([
        "ratstack.sh",
      ]);
      expect(contents(parsed, 'meta[property="og:image"]')).toStrictEqual([
        `${origin}/og/lore.png`,
      ]);
      expect(
        parsed.head.querySelectorAll('script[type="application/ld+json"]')
      ).toHaveLength(2);
    })
);
