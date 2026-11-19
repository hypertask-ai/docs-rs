import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Path, Schema } from "effect";
import type { PlatformError } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import * as Layer from "effect/Layer";

import { normalizeSiteBasePath } from "../../web/src/site-base-path.ts";

const docsOrigin = "https://docs.hypertask.ai";

const builtSiteDirectory = "apps/web/dist/client";

const auditedExtensions = [".css", ".html", ".js"] as const;

const noindexHeader = "x-robots-tag";

class RatstackPublishCheckError extends Schema.TaggedError<
  RatstackPublishCheckError,
  { readonly brand: unique symbol }
>()("RatstackPublishCheckError", { reason: Schema.String }) {}

const OldSiteRecord = Schema.Struct({
  status: Schema.Finite,
  title: Schema.String,
});

const decodeOldSiteRecord = Schema.decodeUnknownEffect(
  Schema.fromJsonString(OldSiteRecord)
);

const siteBasePath = () => normalizeSiteBasePath(process.env.SITE_BASE_PATH);

const titleOf = (html: string): string =>
  /<title>(?<title>[^<]*)<\/title>/u.exec(html)?.groups?.title ?? "";

const robotsMetaOf = (html: string): string =>
  /<meta[^>]*name="robots"[^>]*content="(?<content>[^"]*)"/u.exec(html)?.groups
    ?.content ?? "";

const addressPath = (address: string): string =>
  address.split(/[?#]/u)[0] ?? "";

const wordsIn = (html: string): readonly string[] => {
  const text = html
    .replaceAll(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/giu, " ")
    .replaceAll(/<[^>]*>/gu, " ")
    .replaceAll(/&[a-z]+;|&#[0-9]+;/gu, " ")
    .toLowerCase();

  return [
    ...new Set(text.split(/[^a-z0-9']+/u).filter((word) => word.length >= 4)),
  ];
};

const sameSiteAddresses = (text: string): readonly string[] => {
  const addresses: string[] = [];

  for (const match of text.matchAll(/[=]"(?<value>\/[^"]*)"/gu)) {
    for (const candidate of (match.groups?.value ?? "").split(",")) {
      const address = candidate.trim().split(/\s+/u)[0] ?? "";

      if (address.startsWith("/")) {
        addresses.push(address);
      }
    }
  }

  for (const match of text.matchAll(/url\((?<value>[^)]*)\)/gu)) {
    const address = (match.groups?.value ?? "")
      .trim()
      .replaceAll(/^["']|["']$/gu, "");

    if (address.startsWith("/")) {
      addresses.push(address);
    }
  }

  return addresses;
};

const escapesSiteBasePath = (basePath: string, address: string): boolean => {
  const path = addressPath(address);

  return (
    path !== "" &&
    !path.startsWith("//") &&
    path !== basePath &&
    !path.startsWith(`${basePath}/`)
  );
};

const builtFiles = Effect.fn("ratstackPublishCheck.builtFiles")(
  function* builtFiles(
    root: string,
    directory: string
  ): Effect.fn.Return<
    readonly string[],
    PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    const fs = yield* FileSystem.FileSystem;
    const entries = yield* fs.readDirectory(`${root}/${directory}`);
    const files: string[] = [];

    for (const entry of entries.toSorted()) {
      const file = `${directory}/${entry}`;
      const stat = yield* fs.stat(`${root}/${file}`);

      if (stat.type === "Directory") {
        files.push(...(yield* builtFiles(root, file)));
      } else if (
        auditedExtensions.some((extension) => file.endsWith(extension))
      ) {
        files.push(file);
      }
    }

    return files;
  }
);

const auditBuiltSite = Effect.gen(function* auditBuiltSite() {
  const basePath = siteBasePath();

  if (basePath === "") {
    return yield* new RatstackPublishCheckError({
      reason:
        "SITE_BASE_PATH is empty, so there is no base path to audit. Fix: set SITE_BASE_PATH to /ratstack before building the site that this check reads.",
    });
  }

  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(import.meta.dirname, "../../..");
  const files = yield* builtFiles(root, builtSiteDirectory);
  const failures: string[] = [];

  for (const file of files) {
    const text = yield* fs.readFileString(`${root}/${file}`);

    for (const address of sameSiteAddresses(text)) {
      if (escapesSiteBasePath(basePath, address)) {
        failures.push(
          `${file} points at ${address}, which is outside SITE_BASE_PATH (${basePath}), the only owner of the site's base path. Fix: write that address through addSiteBasePath in apps/web/src/site-base-path.ts so the page, stylesheet or script stays under the base path.`
        );
      }
    }
  }

  if (failures.length > 0) {
    return yield* new RatstackPublishCheckError({
      reason: `${failures.length} address(es) escape the base path.\n${failures.join("\n")}`,
    });
  }

  yield* Console.log(
    `Base path audit passed: ${files.length} built files keep every same-site address under ${basePath}`
  );

  return files.length;
});

const get = Effect.fn("ratstackPublishCheck.get")(function* getAddress(
  url: string
) {
  const response = yield* HttpClient.get(url).pipe(
    Effect.mapError(
      (cause) =>
        new RatstackPublishCheckError({
          reason: `Could not reach ${url}. Fix: check the address and the network, then run the check again. Cause: ${cause.message}`,
        })
    )
  );

  const body = yield* response.text.pipe(
    Effect.mapError(
      () =>
        new RatstackPublishCheckError({
          reason: `${url} answered but its body could not be read. Fix: check the address and the network, then run the check again.`,
        })
    )
  );

  return { body, headers: response.headers, status: response.status };
});

const recordOldSite = Effect.fn("ratstackPublishCheck.record")(
  function* recordOldSite(file: string) {
    const fs = yield* FileSystem.FileSystem;
    const old = yield* get(`${docsOrigin}/`);
    const record = { status: old.status, title: titleOf(old.body) };

    yield* fs.writeFileString(file, `${JSON.stringify(record)}\n`);

    yield* Console.log(
      `Recorded the old site before the deploy: ${docsOrigin}/ answers ${record.status} with title '${record.title}'`
    );

    return record;
  }
);

const expectPage = (
  url: string,
  response: {
    readonly body: string;
    readonly headers: Readonly<Record<string, string | undefined>>;
    readonly status: number;
  }
) =>
  Effect.gen(function* expectPageResponse() {
    const robots = response.headers[noindexHeader] ?? "";

    if (response.status !== 200) {
      return yield* new RatstackPublishCheckError({
        reason: `${url} answers ${response.status}, not 200. Fix: read the deploy log in this workflow run and the Worker's own response, then publish again.`,
      });
    }

    if (!robots.includes("noindex")) {
      return yield* new RatstackPublishCheckError({
        reason: `${url} answers without X-Robots-Tag: noindex, so the preview could compete with the live docs site in search. Fix: set SITE_BASE_PATH when building the site, which owns both the header and the page robots meta tag.`,
      });
    }

    const meta = robotsMetaOf(response.body);

    if (!meta.includes("noindex")) {
      return yield* new RatstackPublishCheckError({
        reason: `${url} has no robots meta tag with noindex. Fix: set SITE_BASE_PATH when building the site, which owns both the page robots meta tag and the header.`,
      });
    }

    return response;
  });

const prefixedAddresses = (
  basePath: string,
  html: string
): readonly string[] => [
  ...new Set(
    [...html.matchAll(/href="(?<href>[^"]*)"/gu)].flatMap((match) => {
      const href = match.groups?.href ?? "";
      const path = addressPath(href);

      return path.startsWith(`${basePath}/`) &&
        !path.startsWith(`${basePath}/search`)
        ? [path]
        : [];
    })
  ),
];

const verifyDeployedSite = Effect.fn("ratstackPublishCheck.verify")(
  function* verifyDeployedSite(file: string) {
    const basePath = siteBasePath();

    if (basePath === "") {
      return yield* new RatstackPublishCheckError({
        reason:
          "SITE_BASE_PATH is empty, so the deploy would sit on the root of docs.hypertask.ai. Fix: set SITE_BASE_PATH to /ratstack and publish again.",
      });
    }

    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const old = yield* get(`${docsOrigin}/`);
    const recorded = yield* decodeOldSiteRecord(yield* fs.readFileString(file));
    const oldTitle = titleOf(old.body);

    if (old.status !== recorded.status || oldTitle !== recorded.title) {
      return yield* new RatstackPublishCheckError({
        reason: `${docsOrigin}/ changed during this publish: it answered ${recorded.status} with title '${recorded.title}' before the deploy and ${old.status} with title '${oldTitle}' after it. Fix: the old site must stay untouched; check the route pattern on the new Worker and roll back anything that reached the old project.`,
      });
    }

    yield* Console.log(
      `The old site still answers ${old.status} with title '${oldTitle}'`
    );

    const home = `${docsOrigin}${basePath}/`;
    const homeResponse = yield* get(home);

    const builtHome = yield* fs.readFileString(
      path.resolve(
        import.meta.dirname,
        "../../..",
        builtSiteDirectory,
        basePath,
        "index.html"
      )
    );

    const expectedTitle = titleOf(builtHome);

    yield* expectPage(home, homeResponse);

    const homeTitle = titleOf(homeResponse.body);

    if (expectedTitle === "" || homeTitle !== expectedTitle) {
      return yield* new RatstackPublishCheckError({
        reason: `${home} has title '${homeTitle}', but the built page it should serve has title '${expectedTitle}'. Fix: publish again and read the deploy log for the asset upload.`,
      });
    }

    yield* Console.log(`${home} answers 200 with title '${homeTitle}'`);

    const oldWords = wordsIn(old.body);
    const publishedWords = new Set(wordsIn(homeResponse.body));
    const missingWords = oldWords.filter((word) => !publishedWords.has(word));

    const share =
      oldWords.length === 0
        ? 0
        : Math.round(
            ((oldWords.length - missingWords.length) / oldWords.length) * 100
          );

    const parity =
      missingWords.length === 0
        ? `${home} carries every word on ${docsOrigin}/`
        : `::warning title=The published home page differs from the old docs home page::${home} carries ${share}% of the words on ${docsOrigin}/ (${oldWords.length - missingWords.length} of ${oldWords.length}). Missing: ${missingWords.slice(0, 12).join(", ")}. The slices that copy the old pages own this difference, and this line reports it on every publish until they land.`;

    yield* Console.log(parity);

    const addresses = prefixedAddresses(basePath, homeResponse.body).slice(
      0,
      3
    );

    if (addresses.length < 3) {
      return yield* new RatstackPublishCheckError({
        reason: `${home} links only ${addresses.length} page(s) under ${basePath}, so three more addresses cannot be proved. Fix: check that the home page renders its navigation through the site's base path builder.`,
      });
    }

    for (const address of addresses) {
      const url = `${docsOrigin}${address}`;
      const response = yield* get(url);

      yield* expectPage(url, response);

      yield* Console.log(`${url} answers 200`);
    }

    yield* Console.log(
      `Smoke check passed: the old site is unchanged and ${1 + addresses.length} addresses under ${basePath} answer 200 with noindex`
    );

    return addresses.length;
  }
);

const program = Effect.gen(function* ratstackPublishCheck() {
  const [mode = "", file = ""] = process.argv.slice(2);

  if (mode === "audit") {
    return yield* auditBuiltSite;
  }

  if (mode === "record") {
    return yield* recordOldSite(file);
  }

  if (mode === "verify") {
    return yield* verifyDeployedSite(file);
  }

  return yield* new RatstackPublishCheckError({
    reason: `Unknown mode '${mode}'. Fix: pass audit, record <file> or verify <file>.`,
  });
}).pipe(
  Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer))
);

NodeRuntime.runMain(program);
