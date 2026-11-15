// @effect-diagnostics nodeBuiltinImport:off -- The fixtures are the old site's own exports, read as bytes.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";

import {
  docsLlmsFull,
  docsLlmsText,
  docsPageMarkdown,
  isDocsRoute,
} from "../src/docs-export.js";
import type { DocsExportEntry, DocsExportPage } from "../src/docs-export.js";

const origin = "https://docs.hypertask.ai";

const fixture = (path: string): string =>
  readFileSync(
    new URL(`fixtures/docs-export/${path}`, import.meta.url),
    "utf-8"
  );

const pageFixtures = [
  "api--rest-api",
  "cli--reference",
  "connect-an-agent",
  "features--agents",
  "features--byok",
  "getting-started--concepts",
  "getting-started--introduction",
  "index",
  "mcp--overview",
] as const;

const splitOnce = (
  text: string,
  separator: string
): readonly [string, string] => {
  const index = text.indexOf(separator);

  if (index === -1) {
    return [text, ""];
  }

  return [text.slice(0, index), text.slice(index + separator.length)];
};

const routeOf = (url: string): string =>
  url.replaceAll(origin, "").replace(/\/$/u, "");

const parsePage = (text: string): DocsExportPage => {
  const [titleLine, rest] = splitOnce(text, "\n\n");
  const [description, body] = splitOnce(rest, "\n\n");

  return {
    body: body.replace(/\n$/u, ""),
    description,
    routePath: "/",
    title: titleLine.replace(/^# /u, ""),
  };
};

const parseLlmsText = (text: string): readonly DocsExportEntry[] => {
  const entries: DocsExportEntry[] = [];
  let listed = false;

  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) {
      listed = line !== "## Start here";
      continue;
    }

    const match =
      /^- \[(?<title>[^\]]+)\]\((?<url>[^)]+)\)(?:: (?<description>.*))?$/u.exec(
        line
      );

    if (!listed || match === null) {
      continue;
    }

    const { groups } = match;

    entries.push({
      description: groups?.description ?? "",
      routePath: routeOf(groups?.url ?? ""),
      title: groups?.title ?? "",
    });
  }

  return entries;
};

const parseLlmsFull = (text: string): readonly DocsExportPage[] => {
  const starts = [...text.matchAll(/\n\n# [^\n]+\nSource: [^\n]+\n\n/gu)];
  const pages: DocsExportPage[] = [];

  for (const [position, match] of starts.entries()) {
    const start = (match.index ?? 0) + 2;
    const end = starts[position + 1]?.index ?? text.length;
    const block = text.slice(start, end);
    const [titleLine, rest] = splitOnce(block, "\n");
    const [sourceLine, body] = splitOnce(rest, "\n\n");

    pages.push({
      body: body.replace(/\n$/u, ""),
      description: "",
      routePath: routeOf(sourceLine.replaceAll("Source: ", "")),
      title: titleLine.replace("# ", ""),
    });
  }

  return pages;
};

const docsPage = (override: Partial<DocsExportPage>): DocsExportPage => ({
  body: "Body.",
  description: "Summary.",
  routePath: "/api/rest-api",
  title: "REST API",
  ...override,
});

describe("docs markdown export", () => {
  for (const name of pageFixtures) {
    it(`keeps the old page Markdown bytes for ${name}`, () => {
      const text = fixture(`pages/${name}.txt`);

      expect(docsPageMarkdown(parsePage(text))).toBe(text);
    });
  }

  it("leaves the description out when the page has none", () => {
    expect(
      docsPageMarkdown(
        docsPage({ description: "", title: "Connect a new agent" })
      )
    ).toBe("# Connect a new agent\n\nBody.\n");
  });
});

describe("docs llms files", () => {
  it("serves the same llms.txt bytes as today", () => {
    expect(docsLlmsText(origin, parseLlmsText(fixture("llms.txt")))).toBe(
      fixture("llms.txt")
    );
  });

  it("serves the same llms-full.txt bytes as today", () => {
    expect(docsLlmsFull(origin, parseLlmsFull(fixture("llms-full.txt")))).toBe(
      fixture("llms-full.txt")
    );
  });

  it("lists the same llms-full.txt pages as today", () => {
    const live = parseLlmsFull(fixture("llms-full.txt"));
    const pages = parseLlmsFull(docsLlmsFull(origin, live));
    const routes = pages.map((page) => page.routePath);

    expect(routes).toEqual(live.map((page) => page.routePath));
    expect(routes.length).toBe(55);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes[0]).toBe("/connect-an-agent");
    expect(pages[0]?.title).toBe("Connect a new agent");
  });

  it("lists every page once across the five sections", () => {
    const text = docsLlmsText(origin, parseLlmsText(fixture("llms.txt")));
    const entries = parseLlmsText(text);
    const routes = entries.map((entry) => entry.routePath);

    expect(new Set(routes).size).toBe(routes.length);
    expect(entries.length).toBe(54);
    expect(text).toContain("# Hypertask\n\n> Hypertask is a task board");
    expect(
      text.endsWith(
        "cli/tasks-assign/): Use hypertask tasks assign to assign tasks to agents or users.\n"
      )
    ).toBe(true);
  });

  it("keeps the home page and changelog entries out of both files", () => {
    const pages = [
      docsPage({
        body: "Home.",
        description: "Home",
        routePath: "/",
        title: "Hypertask",
      }),
      docsPage({
        body: "Entry.",
        description: "Entry",
        routePath: "/changelog/2026-11-10-example",
        title: "Example change",
      }),
      docsPage({}),
    ];

    expect(docsLlmsText(origin, pages)).not.toContain("Home");
    expect(docsLlmsText(origin, pages)).not.toContain("Example change");
    expect(docsLlmsText(origin, pages)).toContain("[REST API](");
    expect(docsLlmsFull(origin, pages)).not.toContain("Home.");
    expect(docsLlmsFull(origin, pages)).not.toContain("Entry.");
    expect(docsLlmsFull(origin, pages)).toContain("# REST API\n");
  });

  it("puts connect a new agent first in llms-full.txt", () => {
    const pages = [
      docsPage({}),
      docsPage({
        body: "Agent.",
        description: "Agent.",
        routePath: "/connect-an-agent",
        title: "Connect a new agent",
      }),
    ];

    expect(
      docsLlmsFull(origin, pages).startsWith(
        "# Hypertask documentation\n\n# Connect a new agent\nSource: https://docs.hypertask.ai/connect-an-agent/\n\nAgent."
      )
    ).toBe(true);
  });
});

describe("docs routes", () => {
  it("covers the five sections and connect a new agent", () => {
    expect(isDocsRoute("/connect-an-agent")).toBe(true);
    expect(isDocsRoute("/getting-started/introduction")).toBe(true);
    expect(isDocsRoute("/features/agents")).toBe(true);
    expect(isDocsRoute("/mcp/overview")).toBe(true);
    expect(isDocsRoute("/api/rest-api")).toBe(true);
    expect(isDocsRoute("/cli/reference")).toBe(true);
  });

  it("leaves the other pages alone", () => {
    expect(isDocsRoute("/")).toBe(false);
    expect(isDocsRoute("/changelog")).toBe(false);
    expect(isDocsRoute("/lore/error-model")).toBe(false);
    expect(isDocsRoute("/tokenmaxx")).toBe(false);
  });
});
