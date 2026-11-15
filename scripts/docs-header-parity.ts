// @effect-diagnostics nodeBuiltinImport:off -- This Node CLI reads the recorded answers and compares two live sites.
import { readFileSync } from "node:fs";
import path from "node:path";

import { Schema } from "effect";

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

const fixture = Schema.decodeUnknownSync(Schema.fromJsonString(Fixture))(
  readFileSync(
    path.join(
      root,
      "apps/site/test/fixtures/docs-response-headers/old-site.json"
    ),
    "utf-8"
  )
);

const headerOf = (response: Response, name: string) =>
  response.headers.get(name)?.trim() ?? "(absent)";

const compare = async (answer: Answer, oldBase: string, newBase: string) => {
  const [oldResponse, newResponse] = await Promise.all([
    fetch(new URL(answer.address, oldBase)),
    fetch(new URL(answer.address, newBase)),
  ]);

  const failures: string[] = [];

  if (oldResponse.status !== newResponse.status) {
    failures.push(`status ${newResponse.status} not ${oldResponse.status}`);
  }

  for (const name of ["cache-control", "content-type"] as const) {
    if (name === "content-type" && answer.contentTypeOwner !== undefined) {
      continue;
    }

    const oldValue = headerOf(oldResponse, name);
    const newValue = headerOf(newResponse, name);

    if (oldValue !== newValue) {
      failures.push(`${name} ${newValue} not ${oldValue}`);
    }
  }

  for (const name of safetyHeaders) {
    const oldValue = headerOf(oldResponse, name);
    const newValue = headerOf(newResponse, name);

    if (oldValue !== "(absent)" && newValue !== oldValue) {
      failures.push(`${name} ${newValue} not ${oldValue}`);
    }
  }

  return { answer, failures };
};

const newBase = process.argv[2];
const oldBase = process.argv[3] ?? "https://docs.hypertask.ai";

if (newBase === undefined) {
  console.error(
    "usage: node scripts/docs-header-parity.ts <new-base> [old-base]"
  );
  process.exitCode = 1;
} else {
  console.log(`old ${oldBase}`);
  console.log(`new ${newBase}`);

  const results = await Promise.all(
    fixture.answers.map((answer) => compare(answer, oldBase, newBase))
  );

  const failed = results.filter(({ failures }) => failures.length > 0);

  for (const { answer, failures } of results) {
    console.log(`${failures.length === 0 ? "PASS" : "FAIL"} ${answer.address}`);

    for (const failure of failures) {
      console.log(`  ${failure}`);
    }
  }

  console.log(
    `${results.length - failed.length} of ${results.length} addresses match`
  );

  process.exitCode = failed.length === 0 ? 0 : 1;
}
