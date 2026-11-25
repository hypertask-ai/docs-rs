import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Schema } from "effect";

import { prepareReader } from "../../web/scripts/reader-build.ts";
import { ReaderFlags } from "../../web/src/client/reader/model.js";

const starterTemplateRoutes: ReadonlySet<string> = new Set([
  "/AGENTS.md",
  "/README.md",
  "/VISION.md",
]);

const allStarsProfileRoute = /^\/all-stars\/[a-z0-9]/u;

it.effect(
  "the built route list holds no Rat Stack starter-template page that the live docs site does not serve",
  () =>
    Effect.gen(function* builtRouteList() {
      const fs = yield* FileSystem.FileSystem;
      const root = yield* fs.makeTempDirectoryScoped();

      yield* prepareReader(root);

      const pages = yield* Schema.decodeEffect(
        Schema.fromJsonString(Schema.Array(ReaderFlags))
      )(yield* fs.readFileString(`${root}/dist/reader-pages.json`));

      const routes = pages.map((page) => page.page.path);

      expect(routes).toContain("/");
      expect(routes).toContain("/getting-started/introduction");
      expect(
        routes.filter((route) => starterTemplateRoutes.has(route))
      ).toEqual([]);
      expect(
        routes.filter((route) => allStarsProfileRoute.test(route))
      ).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer))
);
