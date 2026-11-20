// @effect-diagnostics nodeBuiltinImport:off -- The retired changelog ids are SHA-256 of the announcement text, and the live addresses must keep the same suffix.
import { createHash } from "node:crypto";

import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import {
  announcementKeys,
  parseLegacyChangelog,
} from "@hypertask-docs/core/changelog";
import { Effect, FileSystem, Schema } from "effect";

const repository = new URL("../../../", import.meta.url);

const legacyPath = "src/content/docs/changelog/index.mdx";

const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

const read = (relative: string) =>
  Effect.gen(function* readFixture() {
    const fileSystem = yield* FileSystem.FileSystem;

    return yield* fileSystem.readFileString(
      new URL(relative, repository).pathname
    );
  });

const CapturedFeed = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String })),
});

const overlaps = (date: string, left: string, right: string) =>
  announcementKeys(date, left).some((key) =>
    announcementKeys(date, right).includes(key)
  );

it.effect("reads both the Update and the dated heading formats", () =>
  Effect.gen(function* readBothLegacyFormats() {
    const update =
      '<Update label="January 1, 2099">\n* Added: Board &amp; search updates (HTPR-9999700)\n</Update>';

    const append = yield* read(
      "apps/site/test/fixtures/changelog/changelog-worker-append.mdx"
    );

    const entries = parseLegacyChangelog(
      `${update}\n${append}`,
      "fixture",
      digest
    );

    expect(entries.length).toBe(3);
    expect(entries.map((entry) => entry.date)).toEqual([
      "2099-01-01",
      "2099-01-02",
      "2099-01-02",
    ]);
    expect(entries[0]?.title).toBe("Board & search updates");
    expect(entries[0]?.tags).toEqual(["Board", "Search"]);
    expect(entries[1]?.html.includes("9999701")).toBe(true);
    expect(entries[2]?.html.includes("9999702")).toBe(true);
  }).pipe(Effect.provide(NodeServices.layer))
);

it.effect("reads the real legacy file and keeps every captured address", () =>
  Effect.gen(function* readRealLegacyFile() {
    const raw = yield* read(legacyPath);

    const captured = yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(CapturedFeed)
    )(yield* read("apps/site/test/fixtures/changelog/changelog-json-feed.txt"));

    const entries = parseLegacyChangelog(raw, legacyPath, digest);
    const capturedIds = new Set(captured.items.map((item) => item.id));

    expect(entries.length).toBe(23);

    for (const entry of entries) {
      expect(
        capturedIds.has(`https://docs.hypertask.ai/changelog/${entry.id}/`)
      ).toBe(true);
    }
  }).pipe(Effect.provide(NodeServices.layer))
);

it("keeps ids stable across parses", () => {
  const raw = "## January 1, 2099\n- Improved: CLI output";

  expect(parseLegacyChangelog(raw, "fixture", digest)).toEqual(
    parseLegacyChangelog(raw, "fixture", digest)
  );
});

it("matches announcements on text or on the same ticket set", () => {
  expect(
    overlaps(
      "2099-01-01",
      "Fixed: Original wording (HTPR-1)",
      "Different wording https://app.hypertask.ai/detail/project-15/1"
    )
  ).toBe(true);
  expect(
    overlaps("2099-01-01", "Added: Board &amp; search", "Added: Board & search")
  ).toBe(true);
  expect(
    overlaps(
      "2099-01-01",
      "Changed (HTPR-1) (HTPR-2)",
      "Changed (HTPR-2) (HTPR-1)"
    )
  ).toBe(true);
  expect(
    overlaps(
      "2099-01-01",
      "Changed (HTPR-1) (HTPR-2)",
      "Different change (HTPR-1)"
    )
  ).toBe(false);
  expect(
    announcementKeys("2099-01-01", "Changed (HTPR-1)").some((key) =>
      announcementKeys("2099-01-02", "Changed (HTPR-1)").includes(key)
    )
  ).toBe(false);
  expect(
    overlaps(
      "2099-01-01",
      "No ticket first announcement",
      "No ticket second announcement"
    )
  ).toBe(false);
});

it("escapes markup in the rendered announcement", () => {
  const [entry] = parseLegacyChangelog(
    "## January 1, 2099\n<p>Improved: &lt;script&gt;alert(1)&lt;/script&gt; (HTPR-9)</p>",
    "fixture",
    digest
  );

  expect(entry?.html.includes("<script>")).toBe(false);
  expect(entry?.html.includes("&lt;script&gt;")).toBe(true);
});

it("refuses an invalid date", () => {
  expect(() =>
    parseLegacyChangelog(
      "## Notamonth 1, 2099\n- Fixed: Invalid date",
      "fixture",
      digest
    )
  ).toThrow(/Invalid date/u);
});

it("finds no entries in a file without dated headings", () => {
  const inline = "---\ntitle: Changelog\n---\nNo dated entries";

  expect(parseLegacyChangelog(inline, "fixture", digest)).toEqual([]);
});

it("keeps a wrapped announcement on one line", () => {
  const [entry] = parseLegacyChangelog(
    "## January 1, 2099\n- Improved: CLI output\n  wraps over two lines (HTPR-9)",
    "fixture",
    digest
  );

  expect(entry?.body.includes("wraps over two lines")).toBe(true);
});

it("reads escaped newlines inside an Update block", () => {
  const entries = parseLegacyChangelog(
    '<Update label="January 1, 2099">\\n<p>Fixed: Escaped lines (HTPR-9)</p>\\n</Update>',
    "fixture",
    digest
  );

  expect(entries.length).toBe(1);
});
