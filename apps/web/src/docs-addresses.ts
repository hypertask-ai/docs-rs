export const docsHtmlHandling = "force-trailing-slash" as const;

export const docsSitemapIndexPath = "/sitemap-index.xml";
export const docsSitemapPath = "/sitemap-0.xml";

export const docsSitemapFiles: readonly string[] = [
  docsSitemapIndexPath,
  docsSitemapPath,
];

export type DocsRedirect = {
  readonly destination: string;
  readonly source: string;
  readonly status: 308;
};

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

export const docsAddressAnswer = (
  pages: ReadonlySet<string>,
  pathname: string
): DocsAddressAnswer => {
  const bare = docsBareAddress(pathname);
  const redirect = docsRedirects.find(
    (rule) => docsBareAddress(rule.source) === bare
  );

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
  origin: string
) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${origin}${docsSitemapPath}</loc></sitemap>
</sitemapindex>
`;

export const docsSitemapXml = (
  origin: string,
  pagePaths: readonly string[]
) => {
  const addresses = [...new Set(pagePaths.map(docsTrailingSlashAddress))]
    .toSorted()
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${addresses}
</urlset>
`;
};

const redirectLine = ({ destination, source, status }: DocsRedirect) =>
  `${source} ${destination} ${status}`;

export const docsRedirectLines = (
  pagePaths: readonly string[]
): readonly string[] => {
  const legacySources = new Set(
    docsRedirects.map((rule) => docsBareAddress(rule.source))
  );

  const legacy = docsRedirects.flatMap((rule) => [
    redirectLine(rule),
    redirectLine({ ...rule, source: docsTrailingSlashAddress(rule.source) }),
  ]);

  const slash = [...docsPageSet(pagePaths)]
    .toSorted()
    .filter((source) => source !== "/" && !legacySources.has(source))
    .map((source) => `${source} ${docsTrailingSlashAddress(source)} 308`);

  return [...legacy, ...slash];
};

export const docsRedirectsFile = (pagePaths: readonly string[]) =>
  `${docsRedirectLines(pagePaths).join("\n")}\n`;
