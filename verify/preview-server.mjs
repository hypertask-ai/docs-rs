#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.env.PREVIEW_ROOT ?? "apps/web/dist/client");
const port = Number(process.env.PREVIEW_PORT ?? "4173");
const host = process.env.PREVIEW_HOST ?? "127.0.0.1";
const basePath = (process.env.SITE_BASE_PATH ?? "/ratstack").replace(
  /\/+$/u,
  ""
);

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

const readOptional = async (file) => {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
};

const parseHeaderRules = (text) => {
  const rules = [];
  let current;

  for (const raw of text.split("\n")) {
    if (raw.trim() === "") {
      current = undefined;

      continue;
    }

    if (!/^\s/u.test(raw)) {
      current = { headers: [], pattern: raw.trim() };
      rules.push(current);

      continue;
    }

    const separator = raw.indexOf(":");

    if (current === undefined || separator < 1) {
      continue;
    }

    current.headers.push([
      raw.slice(0, separator).trim().toLowerCase(),
      raw.slice(separator + 1).trim(),
    ]);
  }

  return rules;
};

const parseRedirectRules = (text) =>
  text.split("\n").flatMap((raw) => {
    const line = raw.trim();

    if (line === "" || line.startsWith("#")) {
      return [];
    }

    const [source, destination, status] = line.split(/\s+/u);

    return source === undefined || destination === undefined
      ? []
      : [
          {
            destination,
            source,
            status: Number(status ?? "302"),
          },
        ];
  });

const headerRules = parseHeaderRules(
  await readOptional(path.join(root, "_headers"))
);

const redirectRules = parseRedirectRules(
  await readOptional(path.join(root, "_redirects"))
);

function matchesPattern(pattern, pathname) {
  if (pattern === "*" || pattern === "/*") {
    return true;
  }

  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }

  return pathname === pattern;
}

const headersFor = (pathname, file) => {
  const headers = {
    "Content-Type":
      contentTypes.get(path.extname(file)) ?? "application/octet-stream",
  };

  for (const rule of headerRules) {
    if (!matchesPattern(rule.pattern, pathname)) {
      continue;
    }

    for (const [name, value] of rule.headers) {
      headers[name] = value;
    }
  }

  return headers;
};

const candidatesFor = (pathname) => {
  const candidates = [pathname];
  const mounted =
    basePath !== "" &&
    (pathname === basePath || pathname.startsWith(`${basePath}/`));

  if (mounted) {
    const unmounted = pathname.slice(basePath.length);

    candidates.push(unmounted === "" ? "/" : unmounted);
  }

  return candidates;
};

const safePath = (candidate) => {
  let decoded;

  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return undefined;
  }

  const resolved = path.join(root, decoded);

  return resolved === root || resolved.startsWith(`${root}${path.sep}`)
    ? resolved
    : undefined;
};

const infoAt = async (file) => {
  try {
    return await stat(file);
  } catch {
    return undefined;
  }
};

const lookup = async (pathname) => {
  for (const candidate of candidatesFor(pathname)) {
    const resolved = safePath(candidate);

    if (resolved === undefined) {
      continue;
    }

    const info = await infoAt(resolved);

    if (info === undefined) {
      continue;
    }

    if (!info.isDirectory()) {
      return { file: resolved };
    }

    const index = path.join(resolved, "index.html");

    if ((await infoAt(index))?.isFile() !== true) {
      return { directory: true };
    }

    return { directory: !pathname.endsWith("/"), file: index };
  }

  return {};
};

const sendText = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });
  response.end(body);
};

const respond = async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed\n", { Allow: "GET, HEAD" });

    return;
  }

  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? host}`
  );
  const { pathname, search } = url;
  const redirect = redirectRules.find((rule) =>
    matchesPattern(rule.source, pathname)
  );

  if (redirect !== undefined) {
    response.writeHead(redirect.status, { Location: redirect.destination });
    response.end();

    return;
  }

  const found = await lookup(pathname);

  if (found.directory === true) {
    response.writeHead(308, { Location: `${pathname}/${search}` });
    response.end();

    return;
  }

  if (found.file === undefined) {
    sendText(response, 404, "Not found.\n");

    return;
  }

  const headers = headersFor(pathname, found.file);

  if (request.method === "HEAD") {
    response.writeHead(200, headers);
    response.end();

    return;
  }

  response.writeHead(200, headers);
  createReadStream(found.file).pipe(response);
};

const server = createServer((request, response) => {
  respond(request, response).catch((error) => {
    console.error(`${request.url}: ${String(error)}`);
    sendText(response, 500, "Preview server error\n");
  });
});

server.on("error", (error) => {
  console.error(`The preview server could not listen: ${String(error)}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`preview ready at http://${host}:${port}${basePath}/`);
});
