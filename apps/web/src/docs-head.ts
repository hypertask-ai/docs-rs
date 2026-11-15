import { Option } from "effect";

import { searchCopy } from "./features/docs-copy.js";
import { docsHeaderTabs } from "./features/docs-sidebar.js";
import { escapeAttribute } from "./reader-metadata.js";

export const docsSiteName = "Hypertask Docs";

export const docsTitleSuffix = ` | ${docsSiteName}`;

export const docsPageTitle = (title: string): string =>
  `${title}${docsTitleSuffix}`;

export const docsLocale = "en";

export const docsSitemapPath = "/sitemap-index.xml";

export const docsFaviconHref = "/glyph-white.png";

export const docsFaviconType = "image/png";

export const docsNotFoundPath = "/404/";

export const docsChangelogFeed = {
  href: "/changelog.xml",
  title: "Hypertask Changelog",
  type: "application/rss+xml",
} as const;

const knownSiteTitles: readonly string[] = [docsSiteName, "rat-stack"];

export const docsPageTitleFromDocumentTitle = (
  documentTitle: string
): string => {
  for (const siteTitle of knownSiteTitles) {
    const suffix = ` | ${siteTitle}`;

    if (documentTitle.endsWith(suffix)) {
      return documentTitle.slice(0, -suffix.length);
    }
  }

  return documentTitle;
};

export type DocsPageKind =
  | "changelog-entry"
  | "changelog-index"
  | "home"
  | "not-found"
  | "page"
  | "search";

export interface DocsPageRoute {
  readonly path: string;
  readonly status: number;
}

export const docsPageKind = ({
  path,
  status,
}: DocsPageRoute): DocsPageKind | undefined => {
  if (status === 404) {
    return "not-found";
  }

  if (status >= 400) {
    return undefined;
  }

  if (path === "/search") {
    return "search";
  }

  if (path === "/changelog") {
    return "changelog-index";
  }

  if (path.startsWith("/changelog/")) {
    return "changelog-entry";
  }

  if (path === "/") {
    return "home";
  }

  return docsHeaderTabs.some((tab) => tab.isActive(path)) ? "page" : undefined;
};

export interface DocsHeadInput extends DocsPageRoute {
  readonly description: string | undefined;
  readonly noindex: boolean;
  readonly origin: string;
  readonly pageTitle: string;
}

export interface DocsHead {
  readonly canonical: string;
  readonly lang: string;
  readonly ogUrl: string;
  readonly tags: string;
  readonly title: string;
}

const notFoundPageTitle = "404";

const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value;

const trailingSlash = (path: string): string =>
  path.endsWith("/") ? path : `${path}/`;

const nameTag = (name: string, content: string): string =>
  `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(content)}">`;

const propertyTag = (property: string, content: string): string =>
  `<meta property="${escapeAttribute(property)}" content="${escapeAttribute(content)}">`;

const linkTag = (attributes: readonly (readonly [string, string])[]): string =>
  `<link ${attributes
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ")}>`;

const kindPageTitle = (input: DocsHeadInput, kind: DocsPageKind): string => {
  if (kind === "not-found") {
    return notFoundPageTitle;
  }

  return kind === "search" ? searchCopy.heading : input.pageTitle;
};

const kindCanonicalPath = (
  input: DocsHeadInput,
  kind: DocsPageKind
): string => {
  if (kind === "not-found") {
    return docsNotFoundPath;
  }

  return trailingSlash(kind === "search" ? "/search" : input.path);
};

const kindDescription = (
  input: DocsHeadInput,
  kind: DocsPageKind
): string | undefined =>
  kind === "not-found" || kind === "search"
    ? undefined
    : emptyToUndefined(input.description);

const headFor = (input: DocsHeadInput, kind: DocsPageKind): DocsHead => {
  const pageTitle = kindPageTitle(input, kind);
  const canonical = `${input.origin}${kindCanonicalPath(input, kind)}`;
  const description = kindDescription(input, kind);
  const changelog = kind === "changelog-entry" || kind === "changelog-index";
  const noindex = input.noindex || kind === "search";

  const tags = [
    ...(noindex ? [nameTag("robots", "noindex")] : []),
    linkTag([
      ["rel", "sitemap"],
      ["href", docsSitemapPath],
    ]),
    ...(changelog
      ? [
          linkTag([
            ["rel", "alternate"],
            ["type", docsChangelogFeed.type],
            ["title", docsChangelogFeed.title],
            ["href", docsChangelogFeed.href],
          ]),
        ]
      : []),
    linkTag([
      ["rel", "shortcut icon"],
      ["href", docsFaviconHref],
      ["type", docsFaviconType],
    ]),
    propertyTag("og:title", pageTitle),
    propertyTag("og:type", "article"),
    propertyTag("og:locale", docsLocale),
    ...(description === undefined
      ? []
      : [propertyTag("og:description", description)]),
    propertyTag("og:site_name", docsSiteName),
    nameTag("twitter:card", "summary_large_image"),
    ...(description === undefined ? [] : [nameTag("description", description)]),
  ].join("\n");

  return {
    canonical,
    lang: docsLocale,
    ogUrl: canonical,
    tags,
    title: docsPageTitle(pageTitle),
  };
};

export const docsHead = (input: DocsHeadInput): Option.Option<DocsHead> => {
  const kind = docsPageKind(input);

  return kind === undefined ? Option.none() : Option.some(headFor(input, kind));
};
