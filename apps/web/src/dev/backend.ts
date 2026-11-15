import { contentCapabilities } from "@hypertask-docs/site/capabilities";
import { nodeContentLayer } from "@hypertask-docs/site/node-content";
import { Layer } from "effect";
import { HttpRouter } from "effect/http";

import type { BackendFetch } from "../server/rpc.js";
import { devtoolsRoutes } from "./devtools/routes.js";

const { handler } = HttpRouter.toWebHandler(
  devtoolsRoutes(contentCapabilities).pipe(Layer.provide(nodeContentLayer)),
  {
    disableLogger: true,
  }
);

export const backend: BackendFetch = handler;
