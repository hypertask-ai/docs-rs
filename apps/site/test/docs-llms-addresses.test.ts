import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http/HttpRouter";

import { mischiefRoutes } from "../src/app.js";
import { TestSandbox } from "./test-sandbox.js";

const withHandler = <A, E, R>(
  use: (
    handler: (request: Request) => Promise<Response>
  ) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(
        mischiefRoutes().pipe(Layer.provide(TestSandbox)),
        { disableLogger: true }
      )
    ),
    ({ handler }) => use(handler),
    ({ dispose }) => Effect.promise(dispose)
  );

it.effect("answers not found for llms-small.txt like the live site", () =>
  withHandler((handler) =>
    Effect.gen(function* missingThirdFile() {
      const response = yield* Effect.promise(
        handler.bind(
          undefined,
          new Request("https://docs.hypertask.ai/llms-small.txt")
        )
      );

      expect(response.status).toBe(404);
    })
  )
);
