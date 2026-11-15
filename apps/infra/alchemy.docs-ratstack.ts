import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

import { normalizeSiteBasePath } from "../web/src/site-base-path.js";
import { Website } from "../web/src/website.js";
import { docsRatstackResourcesAllowed } from "./src/docs-ratstack-resources.js";
import { docsRatstackRoute } from "./src/docs-ratstack-route.js";
import { docsRatstackState } from "./src/docs-ratstack-state.js";

export const docsRatstackProgram = Effect.gen(function* docsRatstackStack() {
  const siteBasePath = yield* Config.String("SITE_BASE_PATH").pipe(
    Config.withDefault(""),
    Config.map(normalizeSiteBasePath),
    Effect.orDie
  );

  const route = docsRatstackRoute(siteBasePath);

  const zone = yield* Cloudflare.Zone.Zone("HypertaskDocsZone", {
    name: route.zoneName,
  }).pipe(adopt(true));

  const website = yield* Website;

  yield* Cloudflare.Workers.Route("RatstackDocsRoute", {
    pattern: route.pattern,
    script: website.workerName,
    zoneId: zone.zoneId,
  });

  const stack = yield* Alchemy.Stack;

  if (!docsRatstackResourcesAllowed(stack.resources)) {
    return yield* Effect.die(
      new Error(
        "The docs publish stack declared a resource outside its allowlist, so it could change something the live docs site owns. Fix: keep this stack to the docs Worker, its RPC backend, the hypertask.ai zone and one route under SITE_BASE_PATH, or move the new resource into apps/infra/alchemy.run.ts."
      )
    );
  }

  return { websiteUrl: website.url };
});

export default Alchemy.Stack(
  "DocsRatstack",
  { providers: Cloudflare.providers(), state: docsRatstackState() },
  docsRatstackProgram
);
