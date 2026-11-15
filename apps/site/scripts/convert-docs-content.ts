import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Path, Schema } from "effect";
import type { PlatformError } from "effect";
import { Command, Flag } from "effect/cli";

import {
  convertDocsPage,
  renderConvertedPage,
  routePathOf,
} from "./docs-content-converter.ts";

class DocsConversionBlocked extends Schema.TaggedError<
  DocsConversionBlocked,
  { readonly brand: unique symbol }
>()("DocsConversionBlocked", {
  problems: Schema.Finite,
  source: Schema.String,
}) {
  override get message() {
    return `Docs conversion found ${this.problems} problem(s) under ${this.source}. Fix them in the old source, then rerun \`node apps/site/scripts/convert-docs-content.ts\`.`;
  }
}

const contentFiles = Effect.fn("docsConversion.contentFiles")(
  function* contentFiles(
    root: string,
    directory: string
  ): Effect.fn.Return<
    readonly string[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    const fs = yield* FileSystem.FileSystem;

    const entries = yield* fs.readDirectory(
      directory === "" ? root : `${root}/${directory}`
    );

    const files: string[] = [];

    for (const entry of entries.toSorted()) {
      const file = directory === "" ? entry : `${directory}/${entry}`;
      const stat = yield* fs.stat(`${root}/${file}`);

      if (stat.type === "Directory") {
        files.push(...(yield* contentFiles(root, file)));
      } else if (/\.mdx?$/u.test(file)) {
        files.push(file);
      }
    }

    return files;
  }
);

const convert = Command.make(
  "docs:convert",
  {
    out: Flag.String("out").pipe(Flag.withDefault(".rat/docs-conversion")),
    source: Flag.String("source"),
  },
  Effect.fn(function* runConversion({ out, source }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const files = yield* contentFiles(source, "");

    const pages = yield* Effect.forEach((file: string) =>
      fs.readFileString(`${source}/${file}`).pipe(
        Effect.map((text) => {
          const routePath = routePathOf(file);
          const page = convertDocsPage(text, routePath);

          return { file, page, routePath };
        })
      )
    )(files);

    const problems = pages.flatMap(({ file, page }) =>
      page.problems.map((problem) => `${file}:${problem}`)
    );

    yield* fs.makeDirectory(out, { recursive: true });

    yield* Effect.forEach(({ file, page }: (typeof pages)[number]) =>
      Effect.gen(function* writePage() {
        const target = path.join(out, file.replace(/\.mdx?$/u, ".md"));

        yield* fs.makeDirectory(path.dirname(target), { recursive: true });
        yield* fs.writeFileString(target, renderConvertedPage(page));
      })
    )(pages);

    yield* fs.writeFileString(
      path.join(out, "report.json"),
      JSON.stringify(
        {
          pages: pages.map(({ file, page, routePath }) => ({
            file,
            problems: page.problems,
            routePath,
          })),
          problems,
          total: pages.length,
          version: 1,
        },
        null,
        2
      )
    );

    yield* Console.log(
      `docs:convert wrote ${pages.length} page(s) to ${out} with ${problems.length} problem(s)`
    );

    if (problems.length > 0) {
      return yield* new DocsConversionBlocked({
        problems: problems.length,
        source,
      });
    }

    return yield* Effect.void;
  })
);

NodeRuntime.runMain(
  convert.pipe(
    Command.run({ version: "1.0.0" }),
    Effect.provide(NodeServices.layer)
  )
);
