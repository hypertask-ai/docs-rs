import { toHttpApi } from "@rat-stack/capability/http-api";
import * as AlchemyHttp from "alchemy/Http";
import { Layer } from "effect";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";

import { changelogCapabilities } from "./capabilities/changelog.js";

const changelogApi = toHttpApi(
  "docs.hypertask.ai-changelog",
  changelogCapabilities
);

export const changelogRoutes = HttpApiBuilder.layer(changelogApi.api).pipe(
  Layer.provide(changelogApi.layer),
  Layer.provide(AlchemyHttp.Platform)
);
