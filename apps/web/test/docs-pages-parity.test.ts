// @effect-diagnostics-next-line nodeBuiltinImport:off -- The parity fixtures are committed next to the test and read once at module evaluation.
import { readdirSync, readFileSync } from "node:fs";

import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Context, Effect, Layer, Schema } from "effect";
import { renderToString } from "foldkit/experimental/server";

import { readerBodyFlags } from "../../site/scripts/reader-body-flags.ts";
import { docsArticleOf } from "../../site/test/docs-article-text.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import {
  docsGroupForPath,
  docsHeaderTabs,
  docsSidebarGroups,
} from "../src/features/docs-sidebar.js";
import { view } from "../src/features/reader.js";

const DocsPageFixtureSchema = Schema.Struct({
  cards: Schema.optional(
    Schema.Array(Schema.Struct({ body: Schema.String, title: Schema.String }))
  ),
  description: Schema.String,
  headings: Schema.Array(
    Schema.Struct({ level: Schema.Int, text: Schema.String })
  ),
  images: Schema.Array(
    Schema.Struct({ alt: Schema.String, src: Schema.String })
  ),
  links: Schema.Array(
    Schema.Struct({ href: Schema.String, text: Schema.String })
  ),
  routePath: Schema.String,
  tabLabels: Schema.Array(Schema.String),
  text: Schema.String,
  titleTag: Schema.String,
  videos: Schema.optional(
    Schema.Array(
      Schema.Struct({ title: Schema.String, watchUrl: Schema.String })
    )
  ),
});

type DocsPageFixture = typeof DocsPageFixtureSchema.Type;

const fixtureDirectory = new URL("fixtures/docs/", import.meta.url);

const fixtures: readonly DocsPageFixture[] = readdirSync(fixtureDirectory)
  .filter((file) => file.endsWith(".json"))
  .toSorted()
  .map((file) =>
    Schema.decodeUnknownSync(Schema.fromJsonString(DocsPageFixtureSchema))(
      readFileSync(new URL(file, fixtureDirectory), "utf-8")
    )
  );

const make = Effect.gen(function* docsParityFixture() {
  const flags = yield* readerBodyFlags("https://ratstack.sh");

  return { flags };
});

class DocsParityFixture extends Context.Service<
  DocsParityFixture,
  Effect.Success<typeof make>
>()("@rat-stack/web/test/DocsParityFixture") {
  static readonly layer = Layer.effect(DocsParityFixture, make).pipe(
    Layer.provide(NodeServices.layer)
  );
}

const gettingStartedOrder = [
  "/",
  "/getting-started/introduction",
  "/getting-started/quickstart",
  "/getting-started/switching",
  "/getting-started/concepts",
  "/getting-started/settings-profile",
  "/getting-started/security-and-privacy",
  "/getting-started/troubleshooting-login",
  "/getting-started/apps",
  "/getting-started/contact-support",
] as const;

const referenceOrder = [
  "/cli/reference",
  "/cli/commands",
  "/cli/tasks-assign",
  "/mcp/overview",
  "/mcp/troubleshooting",
  "/mcp/workflows",
  "/mcp/scheduling",
  "/mcp/agents",
  "/mcp/agent-webhooks",
  "/api/rest-api",
  "/api/tools-reference",
  "/connect-an-agent",
  "/changelog",
] as const;

it.layer(DocsParityFixture.layer)((test) => {
  test.effect("every docs page keeps its sidebar group and position", () =>
    Effect.sync(() => {
      const groups = docsSidebarGroups.map((group) => ({
        label: group.label,
        paths: group.items.map((item) => item.path),
      }));

      expect(groups[0]).toEqual({
        label: "Getting started",
        paths: [...gettingStartedOrder],
      });
      expect(groups[2]?.paths).toEqual([...referenceOrder]);

      for (const fixture of fixtures) {
        expect(
          docsGroupForPath(fixture.routePath)?.items.some(
            (item) => item.path === fixture.routePath
          ),
          fixture.routePath
        ).toBe(true);
      }
    })
  );

  test.effect("the header marks the section that owns each docs page", () =>
    Effect.sync(() => {
      for (const fixture of fixtures) {
        const active = docsHeaderTabs.filter((tab) =>
          tab.isActive(fixture.routePath)
        );

        expect(
          active.map((tab) => tab.label),
          fixture.routePath
        ).toEqual([
          fixture.routePath === "/connect-an-agent"
            ? "MCP for AI agents"
            : "Getting started",
        ]);
      }
    })
  );

  for (const fixture of fixtures) {
    test.effect(
      `DocsParity ${fixture.routePath}: the reader shows the text, headings, links and images of the live page`,
      () =>
        Effect.gen(function* docsPageParity() {
          const { flags } = yield* DocsParityFixture;

          const page = flags.find(
            (candidate) => candidate.page.path === fixture.routePath
          );

          expect(page, fixture.routePath).toBeDefined();

          if (page === undefined) {
            return;
          }

          const rendered = yield* renderToString(
            { Flags: ReaderFlags, init, view },
            { flags: page, isHydratable: false }
          );

          const article = docsArticleOf(rendered.html, fixture.routePath);

          expect(rendered.html, fixture.routePath).not.toContain(
            "catppuccin-latte"
          );
          expect(rendered.html, fixture.routePath).not.toContain("#eff1f5");

          expect(page.page.metadata.title, fixture.routePath).toBe(
            fixture.titleTag
          );
          expect(page.page.metadata.description, fixture.routePath).toBe(
            fixture.description
          );
          expect(article.headings, fixture.routePath).toEqual(fixture.headings);
          expect(article.links, fixture.routePath).toEqual(fixture.links);
          expect(article.images, fixture.routePath).toEqual(fixture.images);
          expect(article.tabLabels, fixture.routePath).toEqual(
            fixture.tabLabels
          );
          expect(article.videos, fixture.routePath).toEqual(
            fixture.videos ?? []
          );
          expect(
            article.cards.map(({ body, title }) => ({ body, title })),
            fixture.routePath
          ).toEqual(fixture.cards ?? []);

          for (const card of article.cards) {
            expect(card.icon, fixture.routePath).toBe(true);
            expect(card.bodyTags, fixture.routePath).not.toContain("pre");
          }

          expect(article.text, fixture.routePath).toBe(fixture.text);
        }).pipe(Effect.provide(NodeServices.layer))
    );
  }
});
