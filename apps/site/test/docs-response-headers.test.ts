import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Schema } from "effect";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerRequest from "effect/http/HttpServerRequest";

import { mischiefRoutes, readerResponseHeaders } from "../src/app.js";
import type { StaticResponseCache } from "../src/app.js";
import { ContentStore } from "../src/content-store.js";
import { docsCacheControl } from "../src/docs-response-headers.js";
import { nodeAssetsLayer } from "../src/node-content.js";
import { rateLimitsFrom } from "../src/rate-limits.js";
import type { NativeRateLimitBinding } from "../src/rate-limits.js";
import { withReaderWebsite } from "../src/reader-website.js";
import type { AssetBinding } from "../src/static-assets.js";
import { TestSandbox } from "./test-sandbox.js";

const fixturePath = fileURLToPath(
  new URL("fixtures/docs-response-headers/old-site.json", import.meta.url)
);

const AnswerRow = Schema.Struct({
  address: Schema.String,
  cacheControl: Schema.String,
  contentType: Schema.String,
  contentTypeOwner: Schema.optional(Schema.String),
  etag: Schema.Literals(["absent", "strong", "weak"]),
  etagOwner: Schema.Literals(["code", "host"]),
  kind: Schema.Literals([
    "feed",
    "html",
    "image",
    "llms",
    "markdown",
    "notFound",
    "script",
    "stylesheet",
  ]),
  status: Schema.Finite,
});

type Answer = typeof AnswerRow.Type;

const Fixture = Schema.Struct({ answers: Schema.Array(AnswerRow) });

interface ForwardedAnswer {
  readonly path: string;
  readonly upstreamContentType: string;
}

const forwardedAnswers = new Map<string, ForwardedAnswer>([
  ["/", { path: "/", upstreamContentType: "text/html" }],
  [
    "/_astro/page.BIhdncjw.js",
    {
      path: "/assets/docs/page.BIhdncjw.js",
      upstreamContentType: "text/javascript; charset=utf-8",
    },
  ],
  [
    "/_astro/print.DNXP8c50.css",
    {
      path: "/assets/docs/print.DNXP8c50.css",
      upstreamContentType: "text/css; charset=utf-8",
    },
  ],
  [
    "/favicon.svg",
    {
      path: "/assets/docs/logo.svg",
      upstreamContentType: "image/svg+xml; charset=utf-8",
    },
  ],
  [
    "/getting-started/introduction/",
    { path: "/", upstreamContentType: "text/html" },
  ],
  [
    "/glyph-white.png",
    {
      path: "/assets/screenshots/board-view.png",
      upstreamContentType: "image/png",
    },
  ],
]);

const workerAnswers = new Map<string, string>([
  ["/changelog.json", "/news.xml"],
  ["/changelog.md", "/AGENTS.md"],
  ["/changelog.xml", "/news.xml"],
  ["/getting-started/introduction.md", "/AGENTS.md"],
  ["/index.md", "/AGENTS.md"],
  ["/llms-full.txt", "/llms-full.txt"],
  ["/llms.txt", "/llms.txt"],
  ["/nope-not-a-page", "/nope-not-a-page"],
]);

const readFixture = Effect.gen(function* readOldSiteAnswers() {
  const fs = yield* FileSystem.FileSystem;
  const source = yield* fs.readFileString(fixturePath);

  return yield* Schema.decodeEffect(Schema.fromJsonString(Fixture))(source);
});

interface AnswerHeaders {
  readonly cacheControl: string | null;
  readonly contentType: string | null;
  readonly etag: string | null;
}

const expectAnswer = (answer: Answer, response: AnswerHeaders) => {
  expect(response.cacheControl, `${answer.address} cache control`).toBe(
    answer.cacheControl
  );

  if (answer.contentTypeOwner === undefined) {
    expect(response.contentType, `${answer.address} content type`).toBe(
      answer.contentType
    );
  }

  if (answer.etagOwner === "code") {
    expect(response.etag === null, `${answer.address} etag`).toBe(
      answer.etag === "absent"
    );
  }
};

const websiteReturning = (
  headers: Readonly<Record<string, string>>
): AssetBinding => ({
  fetch: () =>
    Promise.resolve(new Response("<html></html>", { headers, status: 200 })),
});

const fakeStaticCache = (): StaticResponseCache => {
  const responses = new Map<string, Response>();

  return {
    match: (request) => Promise.resolve(responses.get(request.url)?.clone()),
    put: (request, response) => {
      responses.set(request.url, response.clone());

      return Promise.resolve();
    },
  };
};

const fakeRateLimit: NativeRateLimitBinding = {
  limit: () => Promise.resolve({ success: true }),
};

const rateLimits = rateLimitsFrom({
  API_PER_IP: fakeRateLimit,
  EXECUTE_GLOBAL: fakeRateLimit,
  EXECUTE_PER_IP: fakeRateLimit,
  INTEREST_PER_IP: fakeRateLimit,
});

type WebHandler = (request: Request) => Promise<Response>;

const withHandler = <A, E, R>(
  use: (handler: WebHandler) => Effect.Effect<A, E, R>
) =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(
        mischiefRoutes({ rateLimits, staticCache: fakeStaticCache() }).pipe(
          Layer.provide(TestSandbox)
        ),
        { disableLogger: true }
      )
    ),
    ({ handler }) => use(handler),
    ({ dispose }) => Effect.promise(dispose)
  );

const upstreamHeadersOf = (
  answer: Answer,
  target: ForwardedAnswer
): Readonly<Record<string, string>> =>
  answer.kind === "html"
    ? { "content-type": target.upstreamContentType }
    : {
        "cache-control": docsCacheControl,
        "content-type": target.upstreamContentType,
      };

it.layer(
  Layer.merge(
    NodeServices.layer,
    ContentStore.layer.pipe(Layer.provide(nodeAssetsLayer))
  )
)((test) => {
  test.effect(
    "keeps the old docs type and revalidate policy on every answer forwarded to the reader website",
    () =>
      Effect.gen(function* forwardedSiteAnswers() {
        const fixture = yield* readFixture;
        const responseHeaders = readerResponseHeaders(yield* ContentStore);

        const forwarded = fixture.answers.flatMap((answer) => {
          const target = forwardedAnswers.get(answer.address);

          return target === undefined ? [] : [{ answer, target }];
        });

        expect(forwarded).toHaveLength(6);

        for (const { answer, target } of forwarded) {
          const response = yield* withReaderWebsite(
            websiteReturning(upstreamHeadersOf(answer, target)),
            responseHeaders
          )(
            Effect.die(new Error("The reader website answers this address"))
          ).pipe(
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.fromWeb(
                new Request(`https://docs.hypertask.ai${target.path}`, {
                  headers: { accept: "text/html" },
                })
              )
            )
          );

          expectAnswer(answer, {
            cacheControl: response.headers["cache-control"] ?? null,
            contentType: response.headers["content-type"] ?? null,
            etag: response.headers.etag ?? null,
          });
        }
      })
  );

  test.effect(
    "keeps the old docs cache policy and type on every answer the worker builds itself",
    () =>
      Effect.gen(function* workerAnswersInOldForm() {
        const fixture = yield* readFixture;

        const worker = fixture.answers.flatMap((answer) => {
          const path = workerAnswers.get(answer.address);

          return path === undefined ? [] : [{ answer, path }];
        });

        expect(worker).toHaveLength(8);

        yield* withHandler((handler) =>
          Effect.gen(function* compareWorkerAnswers() {
            for (const { answer, path } of worker) {
              const response = yield* Effect.promise(() =>
                handler(
                  new Request(`https://docs.hypertask.ai${path}`, {
                    headers: { accept: "text/html" },
                  })
                )
              );

              expect(response.status, `${answer.address} status`).toBe(
                answer.status
              );

              expectAnswer(answer, {
                cacheControl: response.headers.get("cache-control"),
                contentType: response.headers.get("content-type"),
                etag: response.headers.get("etag"),
              });
            }
          })
        );
      })
  );
});
