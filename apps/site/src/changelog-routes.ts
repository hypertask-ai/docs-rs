import { Effect, Layer } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

import {
  changelogJsonFeed,
  changelogMarkdownFeed,
  changelogRssFeed,
} from "./capabilities/changelog.js";

export const changelogRoutes = Layer.mergeAll(
  HttpRouter.add("GET", "/changelog.json", () =>
    changelogJsonFeed
      .handler({})
      .pipe(
        Effect.map((body) =>
          HttpServerResponse.text(body, { contentType: "application/json" })
        )
      )
  ),
  HttpRouter.add("GET", "/changelog.md", () =>
    changelogMarkdownFeed.handler({}).pipe(
      Effect.map((body) =>
        HttpServerResponse.text(body, {
          contentType: "text/markdown; charset=utf-8",
        })
      )
    )
  ),
  HttpRouter.add("GET", "/changelog.xml", () =>
    changelogRssFeed
      .handler({})
      .pipe(
        Effect.map((body) =>
          HttpServerResponse.text(body, { contentType: "application/xml" })
        )
      )
  )
);
