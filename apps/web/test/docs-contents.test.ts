import { expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  DOCS_TOP_ANCHOR_ID,
  docsReadingLine,
} from "../src/features/docs-contents.js";
import { currentHeadingId } from "../src/features/docs-reading-position.js";
import type { DocsHeadingPosition } from "../src/features/docs-reading-position.js";

const positions: readonly DocsHeadingPosition[] = [
  { id: "_top", top: 168 },
  { id: "setup-options", top: 205 },
  { id: "core-concepts", top: 640 },
];

it("DocsReadingLine: the desktop line is the header bottom plus the old 32px gap and 53px band", () => {
  expect(DOCS_TOP_ANCHOR_ID).toBe("_top");
  expect(docsReadingLine(120)).toBe(205);
  expect(docsReadingLine(0)).toBe(85);
});

it("DocsReadingLine: the current contents row is the last heading at or above the line", () => {
  const line = docsReadingLine(120);

  expect(currentHeadingId(positions, line)).toEqual(
    Option.some("setup-options")
  );

  expect(currentHeadingId(positions, 0)).toEqual(Option.none());

  expect(currentHeadingId(positions, 10_000)).toEqual(
    Option.some("core-concepts")
  );

  expect(currentHeadingId([], line)).toEqual(Option.none());

  expect(currentHeadingId([{ id: "_top", top: 400 }], line)).toEqual(
    Option.none()
  );
});

it("DocsReadingLine: one heading above the line wins over the headings below it, in document order", () => {
  const line = docsReadingLine(120);

  expect(
    currentHeadingId(
      [
        { id: "_top", top: 100 },
        { id: "setup-options", top: 600 },
        { id: "core-concepts", top: 900 },
      ],
      line
    )
  ).toEqual(Option.some("_top"));

  expect(
    currentHeadingId(
      [
        { id: "_top", top: -400 },
        { id: "setup-options", top: 100 },
        { id: "core-concepts", top: 900 },
      ],
      line
    )
  ).toEqual(Option.some("setup-options"));
});
