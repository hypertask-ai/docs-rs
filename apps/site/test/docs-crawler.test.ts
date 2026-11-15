// @effect-diagnostics nodeBuiltinImport:off -- The fixture is the old site's own file, read as bytes.

import { readFileSync } from "node:fs";

import { expect, it } from "@effect/vitest";
import { IntakeTicket } from "@rat-stack/core/intake";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http/HttpRouter";

import { mischiefRoutes } from "../src/app.js";
import { robotsText } from "../src/content.js";
import { StaticAssets } from "../src/static-assets.js";
import { fixtureBytes } from "./generated-content.js";
import { TestSandbox } from "./test-sandbox.js";

const liveRobots = readFileSync(
  new URL("fixtures/docs-export/robots.txt", import.meta.url),
  "utf-8"
);

const fetchFixture = (request: Request): Promise<Response> => {
  const path = new URL(request.url).pathname;

  return Promise.resolve(
    path.startsWith("/_content/") || path.startsWith("/skills/")
      ? new Response(new Uint8Array(fixtureBytes(path)))
      : new Response("ASSET MARKDOWN")
  );
};

const withHandler = <A, E, R>(
  use: (
    handler: (request: Request) => Promise<Response>
  ) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.gen(function* startSite() {
      const assets = yield* StaticAssets.pipe(
        Effect.provide(StaticAssets.layer({ fetch: fetchFixture }))
      );

      return HttpRouter.toWebHandler(
        mischiefRoutes({ assets }).pipe(
          Layer.provide(TestSandbox),
          Layer.provide(IntakeTicket.testLayer)
        ),
        { disableLogger: true }
      );
    }),
    ({ handler }) => use(handler),
    ({ dispose }) => Effect.promise(dispose)
  );

it("keeps the served crawler file equal to the live fixture", () => {
  expect(robotsText).toBe(liveRobots);
});

it.effect("serves the live crawler file byte for byte", () =>
  withHandler((handler) =>
    Effect.gen(function* crawlerFile() {
      const response = yield* Effect.promise(
        handler.bind(
          undefined,
          new Request("https://docs.hypertask.ai/robots.txt")
        )
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(
        "text/plain; charset=utf-8"
      );
      expect(yield* Effect.promise(response.text.bind(response))).toBe(
        liveRobots
      );
    })
  )
);
