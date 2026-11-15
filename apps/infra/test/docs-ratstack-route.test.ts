import { expect, it } from "@effect/vitest";

import { docsRatstackRoute } from "../src/docs-ratstack-route.js";

it("the planned docs route names the same prefix the site build mounts at", () => {
  expect(docsRatstackRoute.pattern).toStrictEqual(
    `docs.hypertask.ai${docsRatstackRoute.basePath}*`
  );
  expect(docsRatstackRoute.basePath).toStrictEqual("/ratstack");
});
