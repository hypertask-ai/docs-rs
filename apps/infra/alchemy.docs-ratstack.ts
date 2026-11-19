import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import * as Effect from "effect/Effect";

import { Website } from "../web/src/website.js";
import { docsRatstackResourcesError } from "./src/docs-ratstack-resources.js";
import { docsRatstackState } from "./src/docs-ratstack-state.js";

export const docsRatstackProgram = Effect.gen(function* docsRatstackStack() {
  const website = yield* Website;

  const stack = yield* Alchemy.Stack;

  const allowlistError = docsRatstackResourcesError(stack.resources);

  if (allowlistError !== undefined) {
    return yield* Effect.die(new Error(allowlistError));
  }

  return { websiteUrl: website.url };
});

export default Alchemy.Stack(
  "DocsRatstack",
  { providers: Cloudflare.providers(), state: docsRatstackState() },
  docsRatstackProgram
);