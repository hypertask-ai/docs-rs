import { expect, it } from "@effect/vitest";

import {
  docsRatstackResourcesAllowed,
  docsRatstackResourcesError,
} from "../src/docs-ratstack-resources.js";
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

it("the publish stack accepts only the docs Worker and its RPC backend", () => {
  const allowed = {
    RpcBackend: { Type: "Cloudflare.Worker" },
    Website: { Type: "Cloudflare.Worker" },
  };

  expect(docsRatstackResourcesAllowed(allowed)).toBe(true);
  expect(docsRatstackResourcesError(allowed)).toBeUndefined();
});

it("the publish stack refuses a Zone resource", () => {
  const headDeclared = {
    HypertaskDocsZone: { Type: "Cloudflare.Zone.Zone" },
    RatstackDocsRoute: { Type: "Cloudflare.Workers.Route" },
    RpcBackend: { Type: "Cloudflare.Worker" },
    Website: { Type: "Cloudflare.Worker" },
  };

  expect(docsRatstackResourcesAllowed(headDeclared)).toBe(false);
  expect(docsRatstackResourcesError(headDeclared)).toMatch(
    /apps\/infra\/alchemy\.docs-ratstack\.ts.*Zone/
  );
});

it("the publish stack refuses DnsRecord, WorkerRoute and extra resources", () => {
  const allowed = {
    RpcBackend: { Type: "Cloudflare.Worker" },
    Website: { Type: "Cloudflare.Worker" },
  };

  expect(
    docsRatstackResourcesError({
      ...allowed,
      HypertaskDocsPages: { Type: "Cloudflare.Pages.Project" },
    })
  ).toContain("apps/infra/alchemy.docs-ratstack.ts");

  expect(
    docsRatstackResourcesError({
      ...allowed,
      RatstackDocsRoute: { Type: "Cloudflare.Workers.Route" },
    })
  ).toMatch(/WorkerRoute/);

  expect(
    docsRatstackResourcesError({
      ...allowed,
      OldCname: { Type: "Cloudflare.DNS.Record" },
    })
  ).toMatch(/DnsRecord/);

  expect(
    docsRatstackResourcesAllowed({
      RpcBackend: allowed.RpcBackend,
      Website: allowed.Website,
    })
  ).toBe(true);
  expect(
    docsRatstackResourcesAllowed({
      ...allowed,
      Website: allowed.Website,
    })
  ).toBe(false);
});
