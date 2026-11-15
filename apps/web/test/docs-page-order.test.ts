import { expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  docsHasContentsList,
  docsPageAt,
  docsPageHref,
  docsPages,
  docsPrevNext,
} from "../src/features/docs-page-order.js";
import { docsSidebarGroups } from "../src/features/docs-sidebar.js";

const labels = (path: string) => {
  const { next, previous } = docsPrevNext(path);

  return {
    next: Option.map(next, (page) => page.label),
    previous: Option.map(previous, (page) => page.label),
  };
};

it("DocsPageOrder: the page order is the sidebar order and holds every sidebar page once", () => {
  expect(docsPages.map(({ label, path }) => ({ label, path }))).toEqual(
    docsSidebarGroups
      .flatMap((group) => group.items)
      .map(({ label, path }) => ({ label, path }))
  );
});

it("DocsPageOrder: previous and next follow the sidebar order across section groups", () => {
  expect(labels("/")).toEqual({
    next: Option.some("What is Hypertask?"),
    previous: Option.none(),
  });

  expect(labels("/getting-started/introduction")).toEqual({
    next: Option.some("Quickstart"),
    previous: Option.some("Overview"),
  });

  expect(labels("/getting-started/contact-support")).toEqual({
    next: Option.some("AI features"),
    previous: Option.some("Mobile and desktop apps"),
  });

  expect(labels("/features/images")).toEqual({
    next: Option.some("CLI reference"),
    previous: Option.some("Agent Chat"),
  });

  expect(labels("/connect-an-agent")).toEqual({
    next: Option.some("Changelog"),
    previous: Option.some("MCP tools reference"),
  });

  expect(labels("/changelog")).toEqual({
    next: Option.none(),
    previous: Option.some("Connect a new agent"),
  });
});

it("DocsPageOrder: the last page has no next link and the first page has no previous link", () => {
  expect(labels("/changelog").next).toEqual(Option.none());
  expect(labels("/").previous).toEqual(Option.none());
});

it("DocsPageOrder: a page hidden from the sidebar has no previous or next link", () => {
  expect(docsPageAt("/features/reports")).toEqual(Option.none());
  expect(labels("/features/reports")).toEqual({
    next: Option.none(),
    previous: Option.none(),
  });
});

it("DocsPageOrder: the changelog index sits in the page order but turns its own pagination off", () => {
  expect(
    Option.map(docsPageAt("/changelog"), (page) => page.pagination)
  ).toEqual(Option.some(false));
  expect(
    Option.map(docsPageAt("/features/reports"), (page) => page.pagination)
  ).toEqual(Option.some(true));
});

it("DocsPageOrder: old page addresses carry the trailing slash the live site serves", () => {
  expect(docsPageHref("/")).toBe("/");
  expect(docsPageHref("/features/boards")).toBe("/features/boards/");
  expect(docsPageHref("/features/boards/")).toBe("/features/boards/");
});

it("DocsPageOrder: every docs page in the sidebar shows the contents list except the changelog index", () => {
  for (const page of docsPages) {
    expect(docsHasContentsList(page.path), page.path).toBe(
      page.path !== "/changelog"
    );
  }

  expect(docsHasContentsList("/")).toBe(true);
  expect(docsHasContentsList("/features/reports/")).toBe(true);
  expect(docsHasContentsList("/lore/services-capture-dependencies")).toBe(
    false
  );
  expect(
    docsHasContentsList(
      "/changelog/2026-11-10-bulk-archive-clears-the-column-at-once-htpr-8928/"
    )
  ).toBe(false);
});
