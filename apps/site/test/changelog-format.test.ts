import { expect, it } from "@effect/vitest";
import { changelogFormatViolations } from "@rat-stack/core/changelog";
import type { ChangelogSource } from "@rat-stack/core/changelog";

import { fenceMessage } from "../../../packages/core/test/fixtures/fence-message.ts";
import { ChangelogFormatError } from "../scripts/changelog-content.ts";

const valid: ChangelogSource = {
  body: "Selecting a whole column and pressing Ctrl+E now empties it immediately.",
  date: "2026-11-10",
  file: "src/content/changelog/2026-11-10-bulk-archive.md",
  raw: '---\ndate: "2026-11-10"\n---\n\nSelecting a whole column now empties it immediately.',
  summary: "Selecting a whole column now empties it immediately.",
  tags: ["Board"],
  title: "Bulk archive clears the column",
};

const violationsFor = (patch: Partial<ChangelogSource>) =>
  changelogFormatViolations([{ ...valid, ...patch }]);

it("accepts a changelog entry that follows the format", () => {
  expect(violationsFor({})).toEqual([]);
});

it("catches a file name that does not start with the date", () => {
  const [violation] = violationsFor({
    file: "src/content/changelog/bulk-archive.md",
  });

  expect(violation?.what).toContain("file name");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("catches a title with markup or a ticket number", () => {
  const [violation] = violationsFor({ title: "Bulk archive (HTPR-8928)" });

  expect(violation?.what).toContain("title");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("catches an entry without area tags", () => {
  const [violation] = violationsFor({ tags: [] });

  expect(violation?.what).toContain("tags");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("catches a summary longer than two sentences", () => {
  const [violation] = violationsFor({
    summary:
      "One sentence here. A second sentence here. A third sentence here.",
  });

  expect(violation?.what).toContain("summary");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("catches a body no longer than its summary", () => {
  const [violation] = violationsFor({ body: valid.summary });

  expect(violation?.what).toContain("body");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("catches a long dash", () => {
  const longDash = String.fromCodePoint(0x20_14);

  const [violation] = violationsFor({
    raw: `${valid.raw}\nSelecting a whole column ${longDash} one step.`,
  });

  expect(violation?.what).toContain("long dash");
  expect(
    fenceMessage(`${violation?.what} ${violation?.why} Fix: ${violation?.fix}`)
  ).toBeDefined();
});

it("names every broken file in the build failure message", () => {
  const error = new ChangelogFormatError({
    violations: violationsFor({ tags: [" "], title: "" }),
  });

  expect(fenceMessage(error.message)).toBeDefined();
  expect(error.message).toContain(valid.file);
  expect(error.message).toContain("pnpm --filter @rat-stack/site generate");
});
