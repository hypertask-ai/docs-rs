import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { renderToString } from "foldkit/experimental/server";

import {
  docsHeaderAnchorItems,
  docsHeaderImageItems,
} from "../../site/test/docs-header-items.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import type { ReaderPageFlags } from "../src/client/reader/model.js";
import { view } from "../src/features/reader-subviews-client.js";
import { readerFlagsFixture } from "./reader-fixture.js";

const headerRow = { help: 2, logo: 0, openApp: 3, search: 1, tabs: 4 };

const tabRows = [
  {
    index: 4,
    label: "Getting started",
    path: "/getting-started/introduction/",
    previous: "Open app",
  },
  {
    index: 5,
    label: "Web App",
    path: "/features/boards/",
    previous: "Getting started",
  },
  {
    index: 6,
    label: "MCP for AI agents",
    path: "/mcp/overview/",
    previous: "Web App",
  },
  {
    index: 7,
    label: "CLI reference",
    path: "/cli/reference/",
    previous: "MCP for AI agents",
  },
  {
    index: 8,
    label: "Changelog",
    path: "/changelog/",
    previous: "CLI reference",
  },
];

const socialHosts = [
  "twitter.com",
  "x.com",
  "github.com",
  "linkedin.com",
  "discord.gg",
  "discord.com",
  "youtube.com",
  "bsky.app",
];

const docsFlags = (path: string): ReaderPageFlags => ({
  ...readerFlagsFixture,
  page: {
    ...readerFlagsFixture.page,
    metadata: { ...readerFlagsFixture.page.metadata, canonicalPath: path },
    path,
  },
});

const docsHeader = (path: string) =>
  Effect.gen(function* renderDocsHeader() {
    const flags = docsFlags(path);

    const rendered = yield* renderToString(
      { Flags: ReaderFlags, init, view },
      { flags, isHydratable: false }
    );

    return {
      anchors: docsHeaderAnchorItems(rendered.html),
      images: docsHeaderImageItems(rendered.html),
    };
  }).pipe(Effect.provide(NodeServices.layer));

it.effect(
  "DocsHeaderRow 1: the logo is the glyph, the Hypertask wordmark and the Docs label, linking home",
  () =>
    Effect.gen(function* logoRow() {
      const { anchors, images } = yield* docsHeader("/");

      const logo = anchors[headerRow.logo];

      expect(logo?.attributes.href).toBe("/");
      expect(logo?.parts).toEqual(["Hypertask", "Docs"]);
      expect(logo?.attributes.target).toBeUndefined();
      expect(logo?.attributes.rel).toBeUndefined();
      expect(logo?.attributes["aria-label"]).toBeUndefined();
      expect(images).toHaveLength(1);
      expect(images[0]?.attributes).toMatchObject({
        alt: "",
        height: "26",
        src: "/glyph-white.png",
        width: "22",
      });
    })
);

it.effect(
  "DocsHeaderRow 2: the search control names itself for screen readers and keeps the Control K shortcut",
  () =>
    Effect.gen(function* searchRow() {
      const { anchors } = yield* docsHeader("/");

      const search = anchors[headerRow.search];

      expect(search?.attributes.href).toBe("/search");
      expect(search?.attributes["aria-label"]).toBe("Search docs");
      expect(search?.attributes["aria-keyshortcuts"]).toBe("Control+K");
      expect(search?.parts).toEqual(["Search docs", "Ctrl K"]);
      expect(search?.attributes.target).toBeUndefined();
      expect(search?.attributes.rel).toBeUndefined();
    })
);

it.effect(
  "DocsHeaderRow 3: Help opens help.hypertask.ai/help in the same tab with no rel",
  () =>
    Effect.gen(function* helpRow() {
      const { anchors } = yield* docsHeader("/");

      const help = anchors[headerRow.help];

      expect(help?.text).toBe("Help");
      expect(help?.attributes.href).toBe("https://help.hypertask.ai/help");
      expect(help?.attributes.target).toBeUndefined();
      expect(help?.attributes.rel).toBeUndefined();
      expect(help?.attributes["aria-label"]).toBeUndefined();
    })
);

it.effect(
  "DocsHeaderRow 4: Open app opens app.hypertask.ai/login in the same tab with no rel",
  () =>
    Effect.gen(function* openAppRow() {
      const { anchors } = yield* docsHeader("/");

      const openApp = anchors[headerRow.openApp];

      expect(openApp?.text).toBe("Open app");
      expect(openApp?.attributes.href).toBe("https://app.hypertask.ai/login");
      expect(openApp?.attributes.target).toBeUndefined();
      expect(openApp?.attributes.rel).toBeUndefined();
      expect(openApp?.attributes["aria-label"]).toBeUndefined();
    })
);

it.effect(
  "DocsHeaderRow 5: the header carries no social links, as the old header renders an empty social list",
  () =>
    Effect.gen(function* socialRow() {
      const { anchors } = yield* docsHeader("/");

      expect(anchors).toHaveLength(headerRow.tabs + tabRows.length);
      expect(
        anchors.filter((anchor) =>
          socialHosts.some((host) =>
            (anchor.attributes.href ?? "").includes(host)
          )
        )
      ).toEqual([]);
    })
);

for (const row of tabRows) {
  it.effect(
    `DocsHeaderRow ${row.index + 1}: the ${row.label} tab keeps its text, its old address and its place`,
    () =>
      Effect.gen(function* tabRow() {
        const { anchors } = yield* docsHeader("/");
        const tab = anchors[row.index];

        expect(tab?.text).toBe(row.label);
        expect(tab?.attributes.href).toBe(row.path);
        expect(tab?.attributes.target).toBeUndefined();
        expect(tab?.attributes.rel).toBeUndefined();
        expect(tab?.attributes["aria-label"]).toBeUndefined();
        expect(anchors[row.index - 1]?.text).toBe(row.previous);
      })
  );
}

const activeTabRows = [
  { address: "/", label: "Getting started" },
  { address: "/getting-started/concepts", label: "Getting started" },
  { address: "/features/boards", label: "Web App" },
  { address: "/mcp/overview", label: "MCP for AI agents" },
  { address: "/api/rest-api", label: "MCP for AI agents" },
  { address: "/connect-an-agent", label: "MCP for AI agents" },
  { address: "/cli/reference", label: "CLI reference" },
  { address: "/changelog/2026-11-10-example", label: "Changelog" },
  { address: "/features/boards/", label: "Web App" },
  { address: "/cli/reference/", label: "CLI reference" },
  { address: "/changelog/", label: "Changelog" },
] as const;

it.effect(
  "DocsHeaderActiveTab: each section marks exactly one tab as the current page",
  () =>
    Effect.gen(function* activeTabRow() {
      for (const row of activeTabRows) {
        const { anchors } = yield* docsHeader(row.address);
        const tabs = anchors.slice(headerRow.tabs);

        const active = tabs
          .filter((tab) => tab.attributes["aria-current"] === "page")
          .map((tab) => tab.text);

        expect(active, row.address).toEqual([row.label]);
        expect(
          tabs
            .filter((tab) => tab.attributes["aria-current"] === "false")
            .map((tab) => tab.text),
          row.address
        ).toEqual([]);
      }
    })
);
