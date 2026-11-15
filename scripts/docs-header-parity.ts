// @effect-diagnostics nodeBuiltinImport:off asyncFunction:off globalFetch:off -- This Node CLI compares two live sites with native HTTP and writes a plain table, outside an Effect runtime.
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

const fixture = Schema.decodeSync(Schema.fromJsonString(Fixture))(
  readFileSync(
    path.join(
      root,
      "apps/site/test/fixtures/docs-response-headers/old-site.json"
    ),
    "utf-8"
  )
);

interface HeaderBag {
  readonly headers: { readonly get: (name: string) => string | null };
}

const headerOf = (response: HeaderBag, name: string) =>
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

const [, , newBase, oldBaseArgument] = process.argv;

const oldBase = oldBaseArgument ?? "https://docs.hypertask.ai";

if (newBase === undefined) {
  process.stderr.write(
    "usage: node scripts/docs-header-parity.ts <new-base> [old-base]\n"
  );
  process.exitCode = 1;
} else {
  const results = await Promise.all(
    fixture.answers.map((answer) => compare(answer, oldBase, newBase))
  );

  const failed = results.filter(({ failures }) => failures.length > 0);

  const lines = [
    `old ${oldBase}`,
    `new ${newBase}`,
    ...results.flatMap(({ answer, failures }) => [
      `${failures.length === 0 ? "PASS" : "FAIL"} ${answer.address}`,
      ...failures.map((failure) => `  ${failure}`),
    ]),
    `${results.length - failed.length} of ${results.length} addresses match`,
  ];

  process.stdout.write(`${lines.join("\n")}\n`);

  process.exitCode = failed.length === 0 ? 0 : 1;
}
