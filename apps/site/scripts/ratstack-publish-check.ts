import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Option, Path, Schema } from "effect";
import type { PlatformError } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import * as Layer from "effect/Layer";
import { ElementType, parseDocument } from "htmlparser2";

import {
  docsPublishHost,
  docsPublishZoneName,
} from "../../web/src/docs-addresses.ts";
import { normalizeSiteBasePath } from "../../web/src/site-base-path.ts";

const docsOrigin = "https://docs.hypertask.ai";

const builtSiteDirectory = "apps/web/dist/client";

const auditedExtensions = [".css", ".html", ".js"] as const;

const noindexHeader = "x-robots-tag";

export class RatstackPublishCheckError extends Schema.TaggedError<
  RatstackPublishCheckError,
  { readonly brand: unique symbol }
>()("RatstackPublishCheckError", { reason: Schema.String }) {
  override get message() {
    return this.reason;
  }
}

const OldSiteRecord = Schema.Struct({
  status: Schema.Finite,
  title: Schema.String,
});

const decodeOldSiteRecord = Schema.decodeUnknownEffect(
  Schema.fromJsonString(OldSiteRecord)
);

const siteBasePath = () => normalizeSiteBasePath(process.env.SITE_BASE_PATH);

export const builtHomePageFile = (basePath: string): string =>
  [builtSiteDirectory, normalizeSiteBasePath(basePath).slice(1), "index.html"]
    .filter((part) => part !== "")
    .join("/");

const titleOf = (html: string): string =>
  /<title>(?<title>[^<]*)<\/title>/u.exec(html)?.groups?.title ?? "";

const robotsMetaOf = (html: string): string =>
  /<meta[^>]*name="robots"[^>]*content="(?<content>[^"]*)"/u.exec(html)?.groups
    ?.content ?? "";

const addressPath = (address: string): string =>
  address.split(/[?#]/u)[0] ?? "";

const hiddenHtmlTags = new Set(["script", "style", "template", "noscript"]);

type HtmlChildren = ReturnType<typeof parseDocument>["children"];

const textIn = (nodes: HtmlChildren): string =>
  nodes
    .map((node) => {
      if (node.type === ElementType.Text) {
        return node.data;
      }

      if (node.type !== ElementType.Tag || hiddenHtmlTags.has(node.name)) {
        return "";
      }

      return textIn(node.children);
    })
    .join(" ");

const wordsIn = (html: string): readonly string[] => {
  const text = textIn(parseDocument(html).children).toLowerCase();

  return [
    ...new Set(text.split(/[^a-z0-9']+/u).filter((word) => word.length >= 4)),
  ];
};

interface HomePageWords {
  readonly missing: readonly string[];
  readonly total: number;
}

const homePageWords = (oldHtml: string, newHtml: string): HomePageWords => {
  const oldWords = wordsIn(oldHtml);
  const newWords = new Set(wordsIn(newHtml));

  return {
    missing: oldWords.filter((word) => !newWords.has(word)),
    total: oldWords.length,
  };
};

const requireHomePageWords = Effect.fn(
  "ratstackPublishCheck.requireHomePageWords"
)(function* requireHomePageWords(address: string, comparison: HomePageWords) {
  if (comparison.missing.length > 0) {
    return yield* new RatstackPublishCheckError({
      reason: `${address} is missing ${comparison.missing.length} of the ${comparison.total} distinct words on ${docsOrigin}/, and this project publishes a home page at that address only when it carries every one of them. Missing: ${comparison.missing.slice(0, 12).join(", ")}. Fix: land the slices that copy the old pages and publish again; nothing is deployed at that address until they do.`,
    });
  }

  return yield* Console.log(
    `${address} carries all ${comparison.total} distinct words on ${docsOrigin}/`
  );
});

const addressAttributes = new Set([
  "action",
  "cite",
  "data",
  "formaction",
  "href",
  "manifest",
  "poster",
  "src",
  "srcset",
]);

const isSameSiteAddress = (address: string): boolean => address.startsWith("/");

const srcsetAddresses = (value: string): readonly string[] =>
  value.split(",").flatMap((candidate) => {
    const address = candidate.trim().split(/\s+/u)[0] ?? "";

    return isSameSiteAddress(address) ? [address] : [];
  });

const urlAddresses = (text: string): readonly string[] =>
  [...text.matchAll(/url\((?<value>[^)]*)\)/gu)].flatMap((match) => {
    const address = (match.groups?.value ?? "")
      .trim()
      .replaceAll(/^["']|["']$/gu, "");

    return isSameSiteAddress(address) ? [address] : [];
  });

const attributeAddresses = (name: string, value: string): readonly string[] => {
  if (name === "srcset") {
    return srcsetAddresses(value);
  }

  return [value].filter(isSameSiteAddress);
};

const htmlAddresses = (html: string): readonly string[] => {
  const addresses: string[] = [];

  const walk = (nodes: HtmlChildren): void => {
    for (const node of nodes) {
      if (!("attribs" in node)) {
        continue;
      }

      for (const [name, value] of Object.entries(node.attribs)) {
        if (name === "style") {
          addresses.push(...urlAddresses(value));
        }

        if (addressAttributes.has(name)) {
          addresses.push(...attributeAddresses(name, value));
        }
      }

      walk(node.children);
    }
  };

  walk(parseDocument(html).children);

  return addresses;
};

const sameSiteAddresses = (file: string, text: string): readonly string[] =>
  file.endsWith(".html") ? htmlAddresses(text) : urlAddresses(text);

const escapesSiteBasePath = (basePath: string, address: string): boolean => {
  const path = addressPath(address);

  return (
    path !== "" &&
    !path.startsWith("//") &&
    path !== basePath &&
    !path.startsWith(`${basePath}/`)
  );
};

export interface BuiltFile {
  readonly file: string;
  readonly text: string;
}

export const basePathEscapeFindings = (
  basePath: string,
  files: readonly BuiltFile[]
): readonly string[] =>
  [
    ...new Set(
      files.flatMap(({ file, text }) =>
        sameSiteAddresses(file, text)
          .filter((address) => escapesSiteBasePath(basePath, address))
          .map((address) => `${file} points at ${address}`)
      )
    ),
  ].toSorted();

export const requireBasePathAddresses = Effect.fn(
  "ratstackPublishCheck.requireBasePathAddresses"
)(function* requireBasePathAddresses(
  basePath: string,
  files: readonly BuiltFile[]
) {
  const escapes = basePathEscapeFindings(basePath, files);

  if (escapes.length > 0) {
    return yield* new RatstackPublishCheckError({
      reason: `Base path check for ${basePath} found these files and addresses outside it:\n${escapes.join("\n")}\nFix: write each address through addSiteBasePath in apps/web/src/site-base-path.ts so the page, stylesheet or script stays under ${basePath}.`,
    });
  }

  return yield* Console.log(
    `Base path audit passed: ${files.length} built files keep every same-site address under ${basePath}`
  );
});

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
  const built: BuiltFile[] = [];

  for (const file of files) {
    built.push({ file, text: yield* fs.readFileString(`${root}/${file}`) });
  }

  yield* requireBasePathAddresses(basePath, built);

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

const builtHomePage = Effect.fn("ratstackPublishCheck.builtHomePage")(
  function* builtHomePage(basePath: string) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    return yield* fs.readFileString(
      path.resolve(import.meta.dirname, "../../..", builtHomePageFile(basePath))
    );
  }
);

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

    const builtHome = yield* builtHomePage(basePath);

    const expectedTitle = titleOf(builtHome);

    yield* expectPage(home, homeResponse);

    const homeTitle = titleOf(homeResponse.body);

    if (expectedTitle === "" || homeTitle !== expectedTitle) {
      return yield* new RatstackPublishCheckError({
        reason: `${home} has title '${homeTitle}', but the built page it should serve has title '${expectedTitle}'. Fix: publish again and read the deploy log for the asset upload.`,
      });
    }

    yield* Console.log(`${home} answers 200 with title '${homeTitle}'`);

    yield* requireHomePageWords(
      home,
      homePageWords(old.body, homeResponse.body)
    );

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

const dnsCnameRecordType = 5;

const dnsJsonAddress = (host: string): string =>
  `https://cloudflare-dns.com/dns-query?name=${host}&type=${dnsCnameRecordType}`;

const DnsAnswerRecord = Schema.Struct({
  data: Schema.String,
  type: Schema.Finite,
});

const DnsAnswer = Schema.Struct({
  Answer: Schema.optionalKey(Schema.Array(DnsAnswerRecord)),
});

const decodeDnsAnswer = Schema.decodeUnknownOption(
  Schema.fromJsonString(DnsAnswer)
);

export const cnameInDnsAnswer = (body: string): string | undefined => {
  const decoded = decodeDnsAnswer(body);

  return Option.isSome(decoded)
    ? decoded.value.Answer?.find((record) => record.type === dnsCnameRecordType)
        ?.data
    : undefined;
};

export interface PublishRouteHost {
  readonly host: string;
  readonly zoneName: string;
}

const publishRouteHost: PublishRouteHost = {
  host: docsPublishHost,
  zoneName: docsPublishZoneName,
};

export const publishRouteBypassReason = (
  target: PublishRouteHost,
  cname?: string
): string | undefined =>
  cname === undefined
    ? undefined
    : `${target.host} answers a DNS-only CNAME to ${cname}, so a request for ${target.host} never enters the ${target.zoneName} zone and the Worker route on it cannot match. The route deploys and the address still answers from the old Pages project. Fix: in the ${target.zoneName} zone, set the ${target.host} record to proxied, so Cloudflare processes the request and the route matches. No change in this repository makes that address answer before the record is proxied.`;

const requireRouteCanMatch = Effect.fn(
  "ratstackPublishCheck.requireRouteCanMatch"
)(function* requireRouteCanMatch() {
  const answer = yield* get(dnsJsonAddress(publishRouteHost.host));

  const reason = publishRouteBypassReason(
    publishRouteHost,
    cnameInDnsAnswer(answer.body)
  );

  if (reason !== undefined) {
    return yield* new RatstackPublishCheckError({ reason });
  }

  return yield* Console.log(
    `${publishRouteHost.host} answers no DNS-only CNAME, so the ${publishRouteHost.zoneName} zone serves it and the Worker route on it can match`
  );
});

const gateBuiltHome = Effect.fn("ratstackPublishCheck.gate")(
  function* gateBuiltHome() {
    yield* requireRouteCanMatch();

    const basePath = siteBasePath();

    if (basePath === "") {
      return yield* new RatstackPublishCheckError({
        reason:
          "SITE_BASE_PATH is empty, so the home page this check compares is the site root. Fix: set SITE_BASE_PATH to /ratstack before building the site that this check reads.",
      });
    }

    const builtHome = yield* builtHomePage(basePath);

    const old = yield* get(`${docsOrigin}/`);

    return yield* requireHomePageWords(
      `${basePath}/ in the built site`,
      homePageWords(old.body, builtHome)
    );
  }
);

const program = Effect.gen(function* ratstackPublishCheck() {
  const [mode = "", file = ""] = process.argv.slice(2);

  if (mode === "audit") {
    return yield* auditBuiltSite;
  }

  if (mode === "gate") {
    return yield* gateBuiltHome();
  }

  if (mode === "record") {
    return yield* recordOldSite(file);
  }

  if (mode === "verify") {
    return yield* verifyDeployedSite(file);
  }

  return yield* new RatstackPublishCheckError({
    reason: `Unknown mode '${mode}'. Fix: pass audit, gate, record <file> or verify <file>.`,
  });
}).pipe(
  Effect.provide(Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer))
);

if (import.meta.main) {
  NodeRuntime.runMain(program);
}
