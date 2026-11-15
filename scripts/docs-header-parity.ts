// @effect-diagnostics nodeBuiltinImport:off -- This Node CLI reads the recorded answers and compares two live sites.
import { readFileSync } from "node:fs";
import path from "node:path";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import * as Layer from "effect/Layer";

const root = path.resolve(import.meta.dirname, "..");

const AnswerRow = Schema.Struct({
  address: Schema.String,
  cacheControl: Schema.String,
  contentType: Schema.String,
  contentTypeOwner: Schema.optional(Schema.String),
});

type Answer = typeof AnswerRow.Type;

const Fixture = Schema.Struct({ answers: Schema.Array(AnswerRow) });

const safetyHeaders = [
  "access-control-allow-origin",
  "referrer-policy",
  "x-content-type-options",
] as const;

const fixture = Schema.decodeSync(Schema.fromJsonString(Fixture))(
  readFileSync(
    path.join(
      root,
      "apps/site/test/fixtures/docs-response-headers/old-site.json"
    ),
    "utf-8"
  )
);

class HeaderParityError extends Schema.TaggedError<
  HeaderParityError,
  { readonly brand: unique symbol }
>()("HeaderParityError", { reason: Schema.String }) {}

const headerOf = (
  headers: Readonly<Record<string, string | undefined>>,
  name: string
) => headers[name]?.trim() ?? "(absent)";

const compare = (answer: Answer, oldBase: string, newBase: string) =>
  Effect.gen(function* compareAnswer() {
    const [oldResponse, newResponse] = yield* Effect.all([
      HttpClient.get(new URL(answer.address, oldBase)),
      HttpClient.get(new URL(answer.address, newBase)),
    ]);

    const failures: string[] = [];

    if (oldResponse.status !== newResponse.status) {
      failures.push(`status ${newResponse.status} not ${oldResponse.status}`);
    }

    for (const name of ["cache-control", "content-type"] as const) {
      if (name === "content-type" && answer.contentTypeOwner !== undefined) {
        continue;
      }

      const oldValue = headerOf(oldResponse.headers, name);
      const newValue = headerOf(newResponse.headers, name);

      if (oldValue !== newValue) {
        failures.push(`${name} ${newValue} not ${oldValue}`);
      }
    }

    for (const name of safetyHeaders) {
      const oldValue = headerOf(oldResponse.headers, name);
      const newValue = headerOf(newResponse.headers, name);

      if (oldValue !== "(absent)" && newValue !== oldValue) {
        failures.push(`${name} ${newValue} not ${oldValue}`);
      }
    }

    return { answer, failures };
  });

const program = Effect.gen(function* compareLiveSites() {
  const newBase = process.argv[2];
  const oldBase = process.argv[3] ?? "https://docs.hypertask.ai";

  if (newBase === undefined) {
    return yield* new HeaderParityError({
      reason: "usage: node scripts/docs-header-parity.ts <new-base> [old-base]",
    });
  }

  yield* Console.log(`old ${oldBase}`);
  yield* Console.log(`new ${newBase}`);

  const results = yield* Effect.forEach(
    fixture.answers,
    (answer) => compare(answer, oldBase, newBase),
    { concurrency: "unbounded" }
  );

  const failed = results.filter(({ failures }) => failures.length > 0);

  yield* Effect.forEach(results, ({ answer, failures }) =>
    Effect.gen(function* printAnswer() {
      yield* Console.log(
        `${failures.length === 0 ? "PASS" : "FAIL"} ${answer.address}`
      );

      yield* Effect.forEach(failures, (failure) => Console.log(`  ${failure}`));
    })
  );

  yield* Console.log(
    `${results.length - failed.length} of ${results.length} addresses match`
  );

  if (failed.length > 0) {
    return yield* new HeaderParityError({
      reason: `${failed.length} of ${results.length} addresses differ`,
    });
  }

  return results.length;
}).pipe(
  Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer))
);

NodeRuntime.runMain(program);
