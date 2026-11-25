// @effect-diagnostics nodeBuiltinImport:off -- These tests join the built home page to the checkout the way the publish step does.
import path from "node:path";

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  basePathEscapeFindings,
  builtHomePageFile,
  cnameInDnsAnswer,
  publishRouteBypassReason,
  RatstackPublishCheckError,
  requireBasePathAddresses,
} from "../scripts/ratstack-publish-check.ts";

const basePath = "/ratstack";

const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

const builtClient = path.resolve(repositoryRoot, "apps/web/dist/client");

it("reads the built home page from inside the built client folder", () => {
  const file = path.resolve(repositoryRoot, builtHomePageFile(basePath));

  expect(file).toBe(`${builtClient}/ratstack/index.html`);
  expect(file.startsWith(`${builtClient}/`)).toBe(true);
});

it("keeps the built home page under the checkout root", () => {
  expect(builtHomePageFile(basePath).startsWith("/")).toBe(false);
  expect(builtHomePageFile("")).toBe("apps/web/dist/client/index.html");
});

it.effect(
  "names every built file and address that sits outside the base path",
  () =>
    Effect.gen(function* refusedBuild() {
      const error = yield* Effect.flip(
        requireBasePathAddresses(basePath, [
          {
            file: "ratstack/index.html",
            text: '<a href="/getting-started/">Getting started</a>',
          },
          {
            file: "ratstack/assets/entry.css",
            text: ".hero { background-image: url(/screenshots/board-view.png) }",
          },
        ])
      );

      expect(error).toBeInstanceOf(RatstackPublishCheckError);
      expect(error.message).toContain(
        "ratstack/index.html points at /getting-started/"
      );
      expect(error.message).toContain(
        "ratstack/assets/entry.css points at /screenshots/board-view.png"
      );
      expect(error.message).toContain(basePath);
      expect(error.message).toContain("addSiteBasePath");
    })
);

it.effect(
  "passes a build whose addresses and stylesheet sources stay under the base path",
  () =>
    Effect.gen(function* acceptedBuild() {
      const addresses = yield* requireBasePathAddresses(basePath, [
        {
          file: "ratstack/index.html",
          text: '<link rel="icon" href="/ratstack/favicon.svg"><script src="https://cdn.usefathom.com/script.js" defer></script><a href="/ratstack/lore/">lore</a><a href="#contents">contents</a><a href="https://app.hypertask.ai">app</a><img srcset="/ratstack/og/home.png 1x, /ratstack/og/home-2x.png 2x" style="background-image: url(\'/ratstack/screenshots/board-view.png\')">',
        },
        {
          file: "ratstack/assets/entry.css",
          text: 'main[data-path="/lore/lauren-tan-skills"] ul { list-style: disc }',
        },
      ]);

      expect(addresses).toBeUndefined();
    })
);

it("reads an address only where the build writes an address", () => {
  expect(
    basePathEscapeFindings(basePath, [
      {
        file: "ratstack/getting-started/introduction/index.html",
        text: '<main data-path="/getting-started/introduction"><p>url(/screenshots/inbox.png) is not an address</p></main>',
      },
      {
        file: "ratstack/assets/entry.css",
        text: 'main[data-path="/lore/lauren-tan-skills"] ul { list-style: "🥔 " }',
      },
    ])
  ).toStrictEqual([]);
});

it("checks every candidate in one srcset and every element that loads an address", () => {
  expect(
    basePathEscapeFindings(basePath, [
      {
        file: "ratstack/index.html",
        text: '<img srcset="/ratstack/og/home.png 1x, /og/home-2x.png 2x"><script type="module" src="/assets/entry.js"></script>',
      },
    ])
  ).toStrictEqual([
    "ratstack/index.html points at /assets/entry.js",
    "ratstack/index.html points at /og/home-2x.png",
  ]);
});

it("names a repeated address once per file", () => {
  expect(
    basePathEscapeFindings(basePath, [
      {
        file: "ratstack/index.html",
        text: '<a href="/log">log</a><a href="/log">log</a>',
      },
    ])
  ).toStrictEqual(["ratstack/index.html points at /log"]);
});

it("reads the CNAME that keeps the publish hostname out of its zone", () => {
  expect(
    cnameInDnsAnswer(
      '{"Status":0,"Question":[{"name":"docs.hypertask.ai","type":5}],"Answer":[{"name":"docs.hypertask.ai","type":5,"TTL":300,"data":"hypertask-docs.pages.dev."}]}'
    )
  ).toBe("hypertask-docs.pages.dev.");

  expect(
    cnameInDnsAnswer(
      '{"Status":0,"Authority":[{"name":"hypertask.ai","type":6,"TTL":1800,"data":"magnolia.ns.cloudflare.com. dns.cloudflare.com. 2420474418 10000 2400 604800 1800"}]}'
    )
  ).toBeUndefined();
});

it("refuses to publish where the Worker route cannot reach the zone", () => {
  const refused = publishRouteBypassReason(
    { host: "docs.hypertask.ai", zoneName: "hypertask.ai" },
    "hypertask-docs.pages.dev."
  );

  expect(refused).toContain("DNS-only CNAME to hypertask-docs.pages.dev.");
  expect(refused).toContain("docs.hypertask.ai");
  expect(refused).toContain("proxied");
});

it("publishes where the zone serves the hostname", () => {
  expect(
    publishRouteBypassReason({
      host: "docs.hypertask.ai",
      zoneName: "hypertask.ai",
    })
  ).toBeUndefined();
});
