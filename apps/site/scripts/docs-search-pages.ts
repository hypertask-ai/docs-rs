import { Effect, FileSystem, Path } from "effect";

import type { DocsPageSource } from "../src/docs-search-index.ts";

export const docsContentDirectory = "apps/site/content/docs";

const frontmatterPattern = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---\r?\n?/u;

const titlePattern = /^title:\s*(?<title>.*)$/mu;

const routePathOf = (file: string): string => {
  const withoutExtension = file.replace(/\.md$/u, "");

  if (withoutExtension === "index") {
    return "/";
  }

  return `/${withoutExtension.replace(/\/index$/u, "")}`;
};

export const docsPageSource = (
  file: string,
  source: string
): DocsPageSource => {
  const frontmatter = frontmatterPattern.exec(source);
  const title =
    titlePattern.exec(frontmatter?.groups?.frontmatter ?? "")?.groups?.title ??
    "";
  const bodyMarkdown =
    frontmatter === null ? source : source.slice(frontmatter[0].length);

  return {
    bodyMarkdown,
    routePath: routePathOf(file),
    title: title.replaceAll(/^["']|["']$/gu, "").trim(),
  };
};

export const readDocsSearchPages = (
  root: string
): Effect.Effect<
  readonly DocsPageSource[],
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* readPages() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = path.join(root, docsContentDirectory);

    if (!(yield* fs.exists(directory))) {
      return [];
    }

    const files = (yield* fs.readDirectory(directory, { recursive: true }))
      .filter((file) => file.endsWith(".md"))
      .toSorted();

    return yield* Effect.forEach(
      files,
      (file) =>
        fs.readFileString(path.join(directory, file)).pipe(
          Effect.map((source) => docsPageSource(file, source)),
          Effect.orElseSucceed(() => undefined)
        ),
      { concurrency: "unbounded" }
    ).pipe(Effect.map((pages) => pages.filter((page) => page !== undefined)));
  });
