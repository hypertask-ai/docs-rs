import * as Cloudflare from "@alchemy.run/cloudflare";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import * as Alchemy from "alchemy";
import { AlchemyContext } from "alchemy/AlchemyContext";
import { collection } from "alchemy/Provider";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import { ConfigProvider, Effect, Layer, Schema } from "effect";

import {
  docsHtmlHandling,
  docsPublishZoneName,
} from "../../web/src/docs-addresses.js";
import { docsRatstackProgram } from "../alchemy.docs-ratstack.js";
import { docsRatstackRoute } from "../src/docs-ratstack-route.js";

const siteBasePath = "/ratstack";

const publishRoute = docsRatstackRoute(siteBasePath);

it.effect(
  "the docs publish stack declares two Workers and attaches the route without a zone",
  () =>
    Alchemy.Stack(
      "DocsRatstack",
      {
        providers: Layer.effect(Cloudflare.Providers, collection([])),
        state: inMemoryState(),
      },
      docsRatstackProgram
    ).pipe(
      Effect.tap((stack) =>
        Effect.gen(function* checkPublishScope() {
          expect(Object.keys(stack.resources).toSorted()).toEqual([
            "RpcBackend",
            "Website",
          ]);

          const websiteProps = yield* Schema.decodeUnknownEffect(
            Schema.Struct({
              domain: Schema.optional(Schema.Unknown),
              routes: Schema.optional(
                Schema.Array(
                  Schema.Struct({
                    pattern: Schema.String,
                    zoneName: Schema.optional(Schema.String),
                  })
                )
              ),
            })
          )(stack.resources.Website?.Props);

          expect(websiteProps.domain).toBeUndefined();
          expect(websiteProps.routes).toEqual([
            {
              pattern: publishRoute.pattern,
              zoneName: docsPublishZoneName,
            },
          ]);

          expect(stack.resources.Website?.Props).toMatchObject({
            assets: {
              htmlHandling: docsHtmlHandling,
            },
            workersDev: false,
          });
        })
      ),
      Effect.provideService(Stage, "docs-ratstack"),
      Effect.provideService(AlchemyContext, {
        adopt: false,
        dev: false,
        dotAlchemy: ".alchemy",
      }),
      Effect.provide(NodeServices.layer),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown({ SITE_BASE_PATH: siteBasePath })
      ),
      Effect.scoped,
      Effect.asVoid
    )
);
