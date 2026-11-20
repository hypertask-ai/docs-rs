import { Option } from "effect";

import { isDocsRoute } from "../../../site/src/docs-export.js";
import { docsSidebarGroups } from "./docs-sidebar.js";

export interface DocsPageLink {
  readonly label: string;
  readonly path: string;
}

export interface DocsPageOrderEntry extends DocsPageLink {
  readonly pagination: boolean;
}

const docsPagesWithPaginationSuppressed: ReadonlySet<string> = new Set([
  "/changelog",
]);

export const docsPages: readonly DocsPageOrderEntry[] =
  docsSidebarGroups.flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      pagination: !docsPagesWithPaginationSuppressed.has(item.path),
      path: item.path,
    }))
  );

export const docsNormalizedPath = (path: string): string =>
  path === "/" ? path : path.replace(/\/+$/u, "");

export const docsPageHref = (path: string): string =>
  path === "/" ? path : `${docsNormalizedPath(path)}/`;

export const docsPageAt = (path: string): Option.Option<DocsPageOrderEntry> => {
  const normalized = docsNormalizedPath(path);

  return Option.fromUndefinedOr(
    docsPages.find((page) => page.path === normalized)
  );
};

export const docsPrevNext = (path: string) => {
  const normalized = docsNormalizedPath(path);
  const index = docsPages.findIndex((page) => page.path === normalized);

  if (index === -1) {
    return {
      next: Option.none<DocsPageOrderEntry>(),
      previous: Option.none<DocsPageOrderEntry>(),
    };
  }

  return {
    next: Option.fromUndefinedOr(docsPages[index + 1]),
    previous:
      index === 0
        ? Option.none<DocsPageOrderEntry>()
        : Option.fromUndefinedOr(docsPages[index - 1]),
  };
};

export const docsHasContentsList = (path: string): boolean => {
  const normalized = docsNormalizedPath(path);

  return normalized === "/" || isDocsRoute(normalized);
};
