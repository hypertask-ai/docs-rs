import { expect, it } from "@effect/vitest";
import { CafePersonEntry } from "@hypertask-docs/core/contracts";
import { Schema } from "effect";
import * as Arbitrary from "effect/Arbitrary";

it.prop(
  "each entry basis decodes and round trips, but news needs a row",
  {
    rows: Arbitrary.schema(
      Schema.Int.check(Schema.isBetween({ maximum: 5, minimum: 1 }))
    ),
    serial: Arbitrary.schema(
      Schema.Int.check(Schema.isBetween({ maximum: 1_000_000, minimum: 1 }))
    ),
  },
  ({ serial, rows }) => {
    const source = `https://example.com/evidence/${serial}`;
    const project = `https://example.com/project/${serial}`;
    const verified = { source, verified: "2026-11-04" };

    const entries = [
      {
        kind: "news",
        rows: Array.from({ length: rows }, (_, index) => `${source}/${index}`),
      },
      { kind: "stack", package: `@example/p${serial}`, source },
      { kind: "vendored", source },
      { kind: "work", project, ...verified },
    ];

    for (const entry of entries) {
      const decoded = Schema.decodeUnknownSync(CafePersonEntry)(entry);

      expect(Schema.encodeSync(CafePersonEntry)(decoded)).toStrictEqual(entry);
    }

    expect(
      Schema.decodeUnknownOption(CafePersonEntry)({ kind: "news", rows: [] })
        ._tag
    ).toBe("None");
  }
);
