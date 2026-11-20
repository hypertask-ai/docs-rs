import { Effect, FileSystem, Path } from "effect";

import { ReaderInputError } from "../../site/scripts/reader-input-error.ts";
import { readerAssetInputs } from "../../site/scripts/reader-site-inputs.ts";
import type { ReaderPageFlags } from "../src/client/reader/model.ts";
import { addSiteBasePath } from "../src/site-base-path.ts";

export const publicIcons: readonly string[] = [
  "/favicon.svg",
  "/glyph-white.png",
];

export const copyPublicIcons = Effect.fn("reader.copyPublicIcons")(
  function* copyPublicIcons(
    root: string,
    clientDirectory: string,
    siteBasePath: string
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;

    return yield* Effect.forEach((icon: string) =>
      Effect.gen(function* copyPublicIcon() {
        const destination = `${clientDirectory}${addSiteBasePath(siteBasePath, icon)}`;

        if (siteBasePath === "" || (yield* fs.exists(destination))) {
          return yield* Effect.void;
        }

        yield* fs.makeDirectory(paths.dirname(destination), {
          recursive: true,
        });

        return yield* fs.copyFile(`${root}/public${icon}`, destination);
      })
    )(publicIcons);
  }
);

export const copyReaderAssets = Effect.fn("reader.copyAssets")(
  function* copyReaderAssets(
    pages: readonly ReaderPageFlags[],
    clientDirectory: string,
    sourcePath: string,
    siteBasePath: string
  ) {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const { directory, manifest } = yield* readerAssetInputs;

    if (!pages.every((page) => page.page.generation === manifest.generation)) {
      return yield* new ReaderInputError({
        message:
          "Reader assets and pages have different generations; regenerate all reader inputs before building",
        sourcePath,
      });
    }

    const serialized = pages.map((page) => JSON.stringify(page));

    const images = [
      ...new Set([
        ...pages.map(
          (page) =>
            new URL(page.page.metadata.ogImagePath, page.origin).pathname
        ),
        ...manifest.images.filter((image) =>
          pages.some(
            (page) =>
              page.page.path !== "/" && image.startsWith(`${page.page.path}/`)
          )
        ),
        ...manifest.images.filter((image) =>
          serialized.some((page) => page.includes(image))
        ),
      ]),
    ];

    return yield* Effect.forEach((image: string) =>
      Effect.gen(function* copyReaderImage() {
        const mountedImage = addSiteBasePath(siteBasePath, image);
        const destination = `${clientDirectory}${mountedImage}`;

        yield* fs.makeDirectory(paths.dirname(destination), {
          recursive: true,
        });
        yield* fs.copyFile(`${directory}${image}`, destination);
      })
    )(images);
  }
);
