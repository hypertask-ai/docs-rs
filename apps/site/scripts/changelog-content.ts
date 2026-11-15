// @effect-diagnostics-next-line nodeBuiltinImport:off -- Retired changelog entry ids are SHA-256 of their announcement text, and the live addresses must keep the same suffix.
import { createHash } from "node:crypto";

import {
  ChangelogFrontmatter,
  announcementKeys,
  changelogFormatViolations,
  legacyChangelogPaths,
  parseLegacyChangelog,
  sortChangelog,
} from "@rat-stack/core/changelog";
import type {
  ChangelogEntryValue,
  ChangelogSource,
} from "@rat-stack/core/changelog";
import { Effect, FileSystem, Path, Schema } from "effect";
import { parse as parseYaml } from "yaml";

import { buildError, violation } from "./content-error.ts";
import { scanLeadingFrontmatterFence } from "./svx-ast.ts";

export const CHANGELOG_DIRECTORY = "src/content/changelog";

const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");

export class ChangelogFormatError extends Schema.TaggedError<
  ChangelogFormatError,
  { readonly brand: unique symbol }
>()("ChangelogFormatError", {
  violations: Schema.Array(
    Schema.Struct({
      file: Schema.String,
      fix: Schema.String,
      what: Schema.String,
      why: Schema.String,
    })
  ),
}) {
  override get message() {
    const count = this.violations.length;

    return `${[
      `The changelog content breaks its format in ${count} ${count === 1 ? "place" : "places"}.`,
      "Readers and outside writers need the same fields and file names.",
      "Fix: repair every file listed below, then rerun `pnpm --filter @rat-stack/site generate`.",
    ].join(" ")}\n${this.violations
      .map(
        ({ file, fix, what, why }) => `${file}: ${what} ${why} Remedy: ${fix}`
      )
      .join("\n")}`;
  }
}

const frontmatterViolation = (sourcePath: string) =>
  violation(
    "The changelog entry has no usable frontmatter.",
    "The date, title, tags, and summary come from it, so the entry cannot reach the feeds.",
    `add a \`---\` block with \`date\`, \`title\`, \`tags\`, and \`summary\` to \`${sourcePath}\`.`
  );

const readSource = Effect.fn("readChangelogSource")(
  function* readChangelogSource(root: string, file: string) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const sourcePath = `${CHANGELOG_DIRECTORY}/${file}`;

    const raw = yield* fileSystem
      .readFileString(path.join(root, CHANGELOG_DIRECTORY, file))
      .pipe(Effect.mapError((cause) => buildError("read", sourcePath, cause)));

    const leading = scanLeadingFrontmatterFence(raw, sourcePath);

    if (leading.yaml === undefined) {
      return yield* Effect.fail(
        buildError(
          "changelog frontmatter",
          sourcePath,
          frontmatterViolation(sourcePath)
        )
      );
    }

    const yaml = leading.yaml.value;

    const frontmatter = yield* Effect.try({
      catch: (cause) =>
        buildError(
          "changelog frontmatter",
          sourcePath,
          violation(
            "The changelog frontmatter is not valid YAML for its four fields.",
            "The feeds read the date, title, tags, and summary from it.",
            `write \`date\`, \`title\`, \`tags\`, and \`summary\` as YAML in \`${sourcePath}\`.`,
            cause
          )
        ),
      try: () => parseYaml(yaml),
    }).pipe(
      Effect.flatMap((parsed) =>
        Schema.decodeUnknownEffect(ChangelogFrontmatter)(parsed).pipe(
          Effect.mapError((cause) =>
            buildError(
              "changelog frontmatter",
              sourcePath,
              violation(
                "The changelog frontmatter does not match its four fields.",
                "The feeds read the date, title, tags, and summary from it.",
                `give \`${sourcePath}\` a \`date\` and \`title\` string, at least one \`tags\` string, and a \`summary\` string.`,
                cause
              )
            )
          )
        )
      )
    );

    const body = leading.body.trim();

    return {
      body,
      date: frontmatter.date,
      file: sourcePath,
      raw,
      summary: frontmatter.summary,
      tags: frontmatter.tags,
      title: frontmatter.title,
    } satisfies ChangelogSource;
  }
);

const legacySources = Effect.fn("readLegacyChangelog")(
  function* readLegacyChangelog(root: string) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const sources: { readonly path: string; readonly raw: string }[] = [];

    for (const candidate of legacyChangelogPaths) {
      const exists = yield* fileSystem
        .exists(path.join(root, candidate))
        .pipe(Effect.orElseSucceed(() => false));

      if (exists) {
        sources.push({
          path: candidate,
          raw: yield* fileSystem
            .readFileString(path.join(root, candidate))
            .pipe(
              Effect.mapError((cause) => buildError("read", candidate, cause))
            ),
        });
      }
    }

    return sources;
  }
);

export const readChangelog = Effect.fn("readChangelog")(function* readChangelog(
  root: string
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const files = (yield* fileSystem
    .readDirectory(path.join(root, CHANGELOG_DIRECTORY))
    .pipe(
      Effect.mapError((cause) => buildError("read", CHANGELOG_DIRECTORY, cause))
    ))
    .filter((file) => /\.mdx?$/u.test(file))
    .toSorted();

  const sources: ChangelogSource[] = [];
  const known = new Set<string>();

  for (const file of files) {
    const source = yield* readSource(root, file);

    sources.push(source);

    for (const text of [
      source.body.match(/## Details\s*\n(?<details>[\s\S]*?)(?:\n## |$)/u)
        ?.groups?.details ?? source.body,
      source.body,
      source.summary,
    ]) {
      for (const key of announcementKeys(source.date, text)) {
        known.add(key);
      }
    }
  }

  const violations = changelogFormatViolations(sources);

  if (violations.length > 0) {
    return yield* Effect.fail(new ChangelogFormatError({ violations }));
  }

  const entries: ChangelogEntryValue[] = sources.map((source) => ({
    body: source.body,
    date: source.date,
    id: source.file
      .slice(source.file.lastIndexOf("/") + 1)
      .replace(/\.mdx?$/u, ""),
    summary: source.summary,
    tags: source.tags,
    title: source.title,
  }));

  for (const legacy of yield* legacySources(root)) {
    for (const entry of parseLegacyChangelog(legacy.raw, legacy.path, digest)) {
      if (entry.keys.some((key) => known.has(key))) {
        continue;
      }

      entries.push({
        body: entry.body,
        date: entry.date,
        html: entry.html,
        id: entry.id,
        summary: entry.summary,
        tags: entry.tags,
        title: entry.title,
      });

      for (const key of entry.keys) {
        known.add(key);
      }
    }
  }

  return sortChangelog(entries);
});
