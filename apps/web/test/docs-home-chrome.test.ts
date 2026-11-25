import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";

const hiddenElements =
  /<(?<tag>noscript|script|style|template)\b[^>]*>[\s\S]*?<\/\k<tag>>/giu;

const tags = /<[^>]*>/gu;

const visibleText = (html: string): string =>
  html.replaceAll(hiddenElements, " ").replaceAll(tags, " ");

const wordsIn = (html: string): ReadonlySet<string> =>
  new Set(
    visibleText(html)
      .toLowerCase()
      .split(/[^a-z0-9']+/u)
      .filter((word) => word.length >= 4)
  );

const chromeWords = [
  "auto",
  "content",
  "dark",
  "light",
  "section",
  "select",
  "skip",
  "terminal",
  "theme",
  "titled",
  "window",
] as const;

it.layer(NodeServices.layer)((test) => {
  test.effect(
    "the built home page carries the words the docs page chrome shows",
    () =>
      Effect.gen(function* homePageChromeWords() {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = path.resolve(import.meta.dirname, "..");

        const html = yield* fs.readFileString(
          path.join(root, "dist", "client", "index.html")
        );

        const words = wordsIn(html);

        expect(chromeWords.filter((word) => !words.has(word))).toStrictEqual(
          []
        );
      })
  );
});
