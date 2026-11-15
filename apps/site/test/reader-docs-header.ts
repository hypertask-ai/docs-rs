import { DomUtils, parseDocument } from "htmlparser2";

import {
  docsHeaderLinks,
  docsHeaderTabs,
} from "../../web/src/features/docs-sidebar.js";
import { homeRouter } from "../../web/src/features/site-route.js";

export interface DocsHeaderAnchor {
  readonly active: boolean;
  readonly href: string;
  readonly text: string;
}

export const docsHeaderAnchors = (
  html: string
): readonly DocsHeaderAnchor[] => {
  const document = parseDocument(html);

  const header = DomUtils.getElementsByTagName(
    "header",
    document.children
  ).find((element) =>
    (element.attribs.class ?? "").split(/\s+/u).includes("docs-header")
  );

  if (header === undefined) {
    throw new Error("Reader page has no docs header");
  }

  return DomUtils.getElementsByTagName("a", header.children).map((element) => ({
    active: element.attribs["aria-current"] === "page",
    href: element.attribs.href ?? "",
    text: DomUtils.textContent(element).trim(),
  }));
};

export const docsHeaderTabAnchors = (
  path: string
): readonly DocsHeaderAnchor[] =>
  docsHeaderTabs.map((tab) => ({
    active: tab.isActive(path),
    href: tab.path,
    text: tab.label,
  }));

export const docsSearchControlLabel = "Search docs";

export const docsHeaderLinkedPaths: readonly string[] = [
  homeRouter(),
  ...docsHeaderLinks.map((link) => link.path),
];
