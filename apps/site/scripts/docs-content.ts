import { Effect, FileSystem, Schema } from "effect";

import type { SourceSpec } from "./content-specs.ts";
import { ReaderInputError } from "./reader-input-error.ts";
import { frontmatterData } from "./svx-ast.ts";

export const docsContentDirectory = "apps/site/content/docs";

const DocsFrontmatter = Schema.Struct({
  description: Schema.String,
  title: Schema.String,
});

export const docsRoutePath = (relativePath: string): `/${string}` => {
  const withoutExtension = relativePath.replace(/\.md$/u, "");

  if (withoutExtension === "index") {
    return "/";
  }

  return `/${withoutExtension.replace(/\/index$/u, "")}`;
};

const specOf = (
  relativePath: string,
  source: string
): Effect.Effect<SourceSpec, ReaderInputError> =>
  Effect.gen(function* readDocsPage() {
    const sourcePath = `${docsContentDirectory}/${relativePath}`;
    const routePath = docsRoutePath(relativePath);
    const frontmatter = yield* Schema.decodeUnknownEffect(DocsFrontmatter)(
      frontmatterData(source, sourcePath)
    ).pipe(
      Effect.mapError(
        (cause) =>
          new ReaderInputError({
            cause,
            message:
              "A docs page needs a title and description in its frontmatter",
            sourcePath,
          })
      )
    );

    return {
      description: frontmatter.description,
      routePath,
      sourcePath,
      title: frontmatter.title,
    };
  });

const markdownFiles = (
  relativeDirectory: string
): Effect.Effect<
  readonly string[],
  ReaderInputError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* listDocsPages() {
    const fs = yield* FileSystem.FileSystem;

    const entries = yield* fs
      .readDirectory(`${docsContentDirectory}/${relativeDirectory}`, {
        recursive: true,
      })
      .pipe(
        Effect.mapError(
          (cause) =>
            new ReaderInputError({
              cause,
              message: "Cannot read the docs content directory",
              sourcePath: docsContentDirectory,
            })
        )
      );

    return entries
      .filter((entry) => entry.endsWith(".md"))
      .map((entry) =>
        relativeDirectory === "" ? entry : `${relativeDirectory}/${entry}`
      )
      .toSorted();
  });

export const readDocsPageSpecs: Effect.Effect<
  readonly SourceSpec[],
  ReaderInputError,
  FileSystem.FileSystem
> = Effect.gen(function* docsPageSpecs() {
  const fs = yield* FileSystem.FileSystem;
  const files = yield* markdownFiles("");

  return yield* Effect.forEach(
    files,
    (file) =>
      fs
        .readFileString(`${docsContentDirectory}/${file}`)
        .pipe(
          Effect.mapError(
            (cause) =>
              new ReaderInputError({
                cause,
                message: "Cannot read a docs page",
                sourcePath: `${docsContentDirectory}/${file}`,
              })
          ),
          Effect.flatMap((source) => specOf(file, source))
        ),
    { concurrency: "unbounded" }
  );
});
