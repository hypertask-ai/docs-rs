import { expect, it } from "@effect/vitest";

import { docsRatstackResourcesAllowed } from "../src/docs-ratstack-resources.js";
import { docsRatstackRoute } from "../src/docs-ratstack-route.js";

it("the published docs route names the same prefix the site build mounts at", () => {
  const route = docsRatstackRoute("/ratstack");

  expect(route.pattern).toStrictEqual(`docs.hypertask.ai${route.basePath}*`);
  expect(route.pattern).toStrictEqual("docs.hypertask.ai/ratstack*");
  expect(route.zoneName).toStrictEqual("hypertask.ai");
});

it("the published docs route follows a trailing slash and refuses the origin root", () => {
  expect(docsRatstackRoute("/ratstack/").pattern).toStrictEqual(
    "docs.hypertask.ai/ratstack*"
  );
  expect(() => docsRatstackRoute("")).toThrow(/SITE_BASE_PATH/u);
  expect(() => docsRatstackRoute("/")).toThrow(/SITE_BASE_PATH/u);
});

it("the publish stack accepts only the docs Worker, its backend, the zone and one route", () => {
  const declared = {
    HypertaskDocsZone: { Type: "Cloudflare.Zone.Zone" },
    RatstackDocsRoute: { Type: "Cloudflare.Workers.Route" },
    RpcBackend: { Type: "Cloudflare.Worker" },
    Website: { Type: "Cloudflare.Worker" },
  };

  expect(docsRatstackResourcesAllowed(declared)).toBe(true);
  expect(
    docsRatstackResourcesAllowed({
      ...declared,
      HypertaskDocsPages: { Type: "Cloudflare.Pages.Project" },
    })
  ).toBe(false);
  expect(
    docsRatstackResourcesAllowed({
      HypertaskDocsZone: declared.HypertaskDocsZone,
      RatstackDocsRoute: declared.RatstackDocsRoute,
      Website: declared.Website,
    })
  ).toBe(false);
  expect(
    docsRatstackResourcesAllowed({
      ...declared,
      RatstackDocsRoute: { Type: "Cloudflare.DNS.Record" },
    })
  ).toBe(false);
});
