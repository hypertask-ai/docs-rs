import { Effect, FileSystem, Path } from "effect";

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
