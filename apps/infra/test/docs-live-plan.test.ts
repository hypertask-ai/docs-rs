import { fileURLToPath } from "node:url";

import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { AuthProviders, Stage } from "alchemy";
import { AlchemyContextLive } from "alchemy/AlchemyContext";
import { ConfigProvider, Effect, FileSystem, Layer } from "effect";
import * as HttpClient from "effect/http/HttpClient";

import stack from "../alchemy.run.js";
import { docsLiveResources, docsLiveSettings } from "../src/docs-live.js";

const schemaPath = fileURLToPath(
  new URL("../../../.env.schema", import.meta.url)
);

const services = Layer.mergeAll(
  AlchemyContextLive.pipe(Layer.provideMerge(NodeServices.layer)),
  Layer.succeed(Stage, "prod"),
  Layer.succeed(AuthProviders, {}),
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make(() => Effect.die("docs-plan-must-not-call-provider"))
  ),
  ConfigProvider.layer(
    ConfigProvider.fromUnknown({
      AUTH_ENABLED: false,
      EMAIL_FORWARD_TO: "forward@example.test",
      EVENTS_ENABLED: false,
    })
  )
);

it.effect(
  "adopts every live docs resource and attaches no live docs domain",
  () =>
    Effect.gen(function* checkDocsPlan() {
      const compiled = yield* stack;

      for (const live of docsLiveResources) {
        const resource = compiled.resources[live.logicalId];

        if (!live.declaredInStack) {
          expect(resource, live.logicalId).toBeUndefined();
          continue;
        }

        expect(resource, live.logicalId).toBeDefined();
        expect(resource?.Adopt, live.logicalId).toBe(true);
        expect(resource?.RemovalPolicy, live.logicalId).toBe("retain");
        expect(resource?.Props, live.logicalId).toMatchObject({
          name: live.name,
        });
      }

      expect(compiled.resources.Website?.Props).not.toHaveProperty("domain");

      for (const resource of Object.values(compiled.resources)) {
        expect(resource.Props, resource.FQN).not.toHaveProperty(
          "domain",
          "docs.hypertask.ai"
        );
      }
    }).pipe(Effect.provide(services))
);

it.effect("declares every live docs setting name with no value", () =>
  Effect.gen(function* checkSettings() {
    const fs = yield* FileSystem.FileSystem;
    const lines = (yield* fs.readFileString(schemaPath)).split("\n");

    for (const setting of docsLiveSettings) {
      const indexes = lines.flatMap((line, index) =>
        line.startsWith(`${setting.name}=`) ? [index] : []
      );

      const index = indexes.at(0);

      expect(indexes.length, setting.name).toBe(1);

      if (index === undefined) {
        continue;
      }

      expect(lines[index], setting.name).toBe(`${setting.name}=`);

      const marker = lines.slice(Math.max(index - 2, 0), index).join("\n");

      expect(marker, setting.name).toContain(
        setting.sensitive ? "# @sensitive=true" : "# @sensitive=false"
      );
    }
  }).pipe(Effect.provide(NodeServices.layer))
);
