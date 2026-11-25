import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { prepareReader } from "../../web/scripts/reader-build.ts";
import { ReaderFlags } from "../../web/src/client/reader/model.js";
import {
  addSiteBasePath,
  normalizeSiteBasePath,
} from "../../web/src/site-base-path.ts";

const starterTemplateRoutes: ReadonlySet<string> = new Set([
  "/AGENTS.md",
  "/README.md",
  "/VISION.md",
]);

const allStarsProfileRoute = /^\/all-stars\/[a-z0-9]/u;

const repoRoot = new URL("../../../", import.meta.url).pathname;

const BuildTask = Schema.Struct({
  environmentVariables: Schema.Struct({
    specified: Schema.Struct({ env: Schema.Array(Schema.String) }),
  }),
  taskId: Schema.String,
});

const BuildPlan = Schema.Struct({ tasks: Schema.Array(BuildTask) });

const jsonFrom = (text: string): string => text.slice(text.indexOf("{"));

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

it.effect(
  "the build keeps a getting-started page and the stylesheet under the base path it is given",
  () =>
    Effect.gen(function* basePathInBuild() {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

      const planned = yield* spawner.string(
        ChildProcess.make(
          "pnpm",
          ["exec", "--", "turbo", "run", "build", "--dry=json"],
          {
            cwd: repoRoot,
            env: { SITE_BASE_PATH: "/ratstack" },
            extendEnv: true,
          }
        )
      );

      const plan = yield* Schema.decodeEffect(Schema.fromJsonString(BuildPlan))(
        jsonFrom(planned)
      );

      const siteBuild = plan.tasks.filter(
        (task) => task.taskId === "@hypertask-docs/web#build"
      );

      expect(siteBuild).toHaveLength(1);
      expect(siteBuild[0]?.environmentVariables.specified.env).toContain(
        "SITE_BASE_PATH"
      );

      const basePath = normalizeSiteBasePath("/ratstack");

      expect(
        addSiteBasePath(basePath, "/getting-started/quickstart/")
      ).toStrictEqual("/ratstack/getting-started/quickstart/");
      expect(addSiteBasePath(basePath, "/assets/app-built.css")).toStrictEqual(
        "/ratstack/assets/app-built.css"
      );
    }).pipe(Effect.provide(NodeServices.layer))
);
