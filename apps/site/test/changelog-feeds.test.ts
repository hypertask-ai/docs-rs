import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  changelogJsonText,
  changelogMarkdownText,
  changelogRssText,
} from "@rat-stack/core/changelog";
import { Effect, FileSystem, Schema } from "effect";

import { readChangelog } from "../scripts/changelog-content.ts";

const repositoryRoot = new URL("../../../", import.meta.url).pathname;

const JsonFeed = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      content_text: Schema.String,
      date_published: Schema.String,
      id: Schema.String,
      summary: Schema.String,
      tags: Schema.Array(Schema.String),
      title: Schema.String,
      url: Schema.String,
    })
  ),
});

const readFixture = (name: string) =>
  Effect.gen(function* readCapturedFeed() {
    const fileSystem = yield* FileSystem.FileSystem;

    return yield* fileSystem.readFileString(
      new URL(`./fixtures/changelog/${name}`, import.meta.url).pathname
    );
  });

const markdownBlocks = (text: string) =>
  text
    .split("\n\n## ")
    .slice(1)
    .map((block) => `## ${block}`);

const rssItems = (text: string) => text.match(/<item>[\s\S]*?<\/item>/gu) ?? [];

const containsInOrder = (
  haystack: readonly string[],
  needles: readonly string[]
) => {
  let index = 0;

  for (const needle of needles) {
    const found = haystack.indexOf(needle, index);

    if (found === -1) {
      return false;
    }

    index = found + 1;
  }

  return true;
};

it.effect(
  "reproduces the live changelog JSON feed for every captured entry",
  () =>
    Effect.gen(function* reproduceJsonFeed() {
      const entries = yield* readChangelog(repositoryRoot);
      const captured = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(JsonFeed)
      )(yield* readFixture("changelog-json-feed.txt"));
      const produced = yield* Schema.decodeUnknownEffect(
        Schema.fromJsonString(JsonFeed)
      )(changelogJsonText(entries));
      const capturedIds = new Set(captured.items.map((item) => item.id));
      const pinned = produced.items.filter((item) => capturedIds.has(item.id));

      expect(pinned.slice(0, 20).map((item) => item.id)).toEqual(
        captured.items.slice(0, 20).map((item) => item.id)
      );
      expect(pinned).toEqual(captured.items);
    }).pipe(Effect.provide(NodeServices.layer))
);

it.effect(
  "reproduces the live changelog markdown feed for every captured entry",
  () =>
    Effect.gen(function* reproduceMarkdownFeed() {
      const entries = yield* readChangelog(repositoryRoot);
      const captured = markdownBlocks(
        yield* readFixture("changelog-markdown-feed.txt")
      );
      const produced = markdownBlocks(changelogMarkdownText(entries));

      expect(containsInOrder(produced, captured.slice(0, 20))).toBe(true);
      expect(containsInOrder(produced, captured)).toBe(true);
    }).pipe(Effect.provide(NodeServices.layer))
);

it.effect(
  "reproduces the live changelog RSS feed for every captured entry",
  () =>
    Effect.gen(function* reproduceRssFeed() {
      const entries = yield* readChangelog(repositoryRoot);
      const captured = rssItems(yield* readFixture("changelog-rss-feed.txt"));
      const produced = rssItems(changelogRssText(entries));

      expect(containsInOrder(produced, captured.slice(0, 20))).toBe(true);
      expect(containsInOrder(produced, captured)).toBe(true);
    }).pipe(Effect.provide(NodeServices.layer))
);
