import { addSiteBasePath } from "./site-base-path.js";

export const docsHtmlHandling = "force-trailing-slash" as const;

export const docsSitemapIndexPath = "/sitemap-index.xml";

export const docsSitemapPath = "/sitemap-0.xml";

export const docsSitemapFiles: readonly string[] = [
  docsSitemapIndexPath,
  docsSitemapPath,
];

export interface DocsRedirect {
  readonly destination: string;
  readonly source: string;
  readonly status: 308;
}

export const docsRedirects: readonly DocsRedirect[] = [
  {
    destination: "/getting-started/apps/",
    source: "/features/desktop",
    status: 308,
  },
];

export const docsNotFound = {
  code: 404,
  message: "Page not found. Check the URL or try using the search bar.",
  title: "Page not found",
} as const;

export const docsTrailingSlashAddress = (path: string) =>
  path === "/" || path.endsWith("/") ? path : `${path}/`;

export const docsBareAddress = (path: string) =>
  path === "/" ? path : path.replace(/\/+$/u, "");

export const docsMarkdownAddress = (path: string) =>
  path === "/" ? "/index.md" : `${docsBareAddress(path)}.md`;

export const docsPageSet = (pagePaths: readonly string[]) =>
  new Set(pagePaths.map(docsBareAddress));

const markdownPage = (address: string) =>
  address === "/index.md" ? "/" : docsBareAddress(address.slice(0, -3));

export type DocsAddressAnswer =
  | { readonly kind: "markdown"; readonly path: string }
  | { readonly kind: "notFound"; readonly code: 404; readonly path: string }
  | { readonly kind: "page"; readonly path: string }
  | {
      readonly kind: "redirect";
      readonly location: string;
      readonly status: 308;
    };

export const docsRedirectFor = (pathname: string) => {
  const bare = docsBareAddress(pathname);

  return docsRedirects.find((rule) => docsBareAddress(rule.source) === bare);
};

export const docsAddressAnswer = (
  pages: ReadonlySet<string>,
  pathname: string
): DocsAddressAnswer => {
  const bare = docsBareAddress(pathname);

  const redirect = docsRedirectFor(pathname);

  if (redirect !== undefined) {
    return {
      kind: "redirect",
      location: redirect.destination,
      status: redirect.status,
    };
  }

  if (pathname.endsWith(".md")) {
    return pages.has(markdownPage(pathname))
      ? { kind: "markdown", path: pathname }
      : { code: docsNotFound.code, kind: "notFound", path: pathname };
  }

  if (!pages.has(bare)) {
    return { code: docsNotFound.code, kind: "notFound", path: pathname };
  }

  return docsTrailingSlashAddress(pathname) === pathname
    ? { kind: "page", path: pathname }
    : {
        kind: "redirect",
        location: docsTrailingSlashAddress(bare),
        status: 308,
      };
};

export const docsNotFoundPage = (pathname: string) => ({
  code: docsNotFound.code,
  message: docsNotFound.message,
  path: pathname,
  title: docsNotFound.title,
});

export const docsSitemapIndexXml = (
  origin: string,
  basePath = ""
) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${origin}${addSiteBasePath(basePath, docsSitemapPath)}</loc></sitemap>
</sitemapindex>
`;

export const docsSitemapXml = (
  origin: string,
  pagePaths: readonly string[],
  basePath = ""
) => {
  const addresses = [
    ...new Set(
      pagePaths.map((path) =>
        docsTrailingSlashAddress(addSiteBasePath(basePath, path))
      )
    ),
  ]
    .toSorted()
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${addresses}
</urlset>
`;
};

const redirectLine = (
  { destination, source, status }: DocsRedirect,
  basePath: string
) =>
  `${addSiteBasePath(basePath, source)} ${addSiteBasePath(basePath, destination)} ${status}`;

export const docsRedirectLines = (
  pagePaths: readonly string[],
  basePath = ""
): readonly string[] => {
  const legacySources = new Set(
    docsRedirects.map((rule) => docsBareAddress(rule.source))
  );

  const legacy = docsRedirects.flatMap((rule) => [
    redirectLine(rule, basePath),
    redirectLine(
      { ...rule, source: docsTrailingSlashAddress(rule.source) },
      basePath
    ),
  ]);

  const slash = [...docsPageSet(pagePaths)].toSorted().flatMap((source) =>
    source === "/" || legacySources.has(source)
      ? []
      : [
          redirectLine(
            {
              destination: docsTrailingSlashAddress(source),
              source,
              status: 308,
            },
            basePath
          ),
        ]
  );

  return [...legacy, ...slash];
};

export const docsRedirectsFile = (
  pagePaths: readonly string[],
  basePath = ""
) => `${docsRedirectLines(pagePaths, basePath).join("\n")}\n`;
