import { DomUtils, ElementType, parseDocument } from "htmlparser2";

type DomNode = ReturnType<typeof parseDocument>["children"][number];
type Element = Parameters<typeof DomUtils.getAttributeValue>[0];

const blockTags = new Set([
  "article",
  "aside",
  "blockquote",
  "caption",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const skippedTags = new Set([
  "footer",
  "iframe",
  "noscript",
  "script",
  "style",
  "svg",
]);

const chromeClasses = new Set([
  "sl-anchor-icon",
  "sl-anchor-link",
  "sr-only",
  "visually-hidden",
]);

const headingLevels = new Map([
  ["h1", 1],
  ["h2", 2],
  ["h3", 3],
  ["h4", 4],
  ["h5", 5],
  ["h6", 6],
]);

export interface DocsArticleHeading {
  readonly level: number;
  readonly text: string;
}

export interface DocsArticleLink {
  readonly href: string;
  readonly text: string;
}

export interface DocsArticleImage {
  readonly alt: string;
  readonly src: string;
}

export interface DocsArticle {
  readonly headings: readonly DocsArticleHeading[];
  readonly images: readonly DocsArticleImage[];
  readonly links: readonly DocsArticleLink[];
  readonly tabLabels: readonly string[];
  readonly text: string;
}

export const normalizeArticleText = (value: string) =>
  value.replaceAll("\u00a0", " ").replaceAll(/\s+/gu, " ").trim();

const classesOf = (element: Element) =>
  (element.attribs.class ?? "").split(/\s+/u);

const isSkipped = (element: Element) =>
  skippedTags.has(element.name) ||
  classesOf(element).some((name) => chromeClasses.has(name));

const isTabLabel = (element: Element) =>
  classesOf(element).includes("docs-tab-label") ||
  element.attribs.role === "tab";

export const docsArticleOf = (html: string, path: string): DocsArticle => {
  const document = parseDocument(html);

  const main = DomUtils.getElementsByTagName("main", document.children).find(
    (element) => element.attribs["data-path"] === path
  );

  if (main === undefined) {
    throw new Error(`The reader page at ${path} has no main element`);
  }

  const parts: string[] = [];
  const headings: DocsArticleHeading[] = [];
  const links: DocsArticleLink[] = [];
  const images: DocsArticleImage[] = [];
  const tabLabels: string[] = [];

  const visit = (
    node: DomNode,
    captures: readonly string[][],
    collect: boolean
  ): void => {
    if (node.type === ElementType.Text) {
      if (collect) {
        parts.push(node.data);
      }

      for (const capture of captures) {
        capture.push(node.data);
      }

      return;
    }

    if (node.type !== ElementType.Tag) {
      return;
    }

    if (isTabLabel(node)) {
      const label: string[] = [];

      for (const child of node.children) {
        visit(child, [...captures, label], false);
      }

      tabLabels.push(normalizeArticleText(label.join("")));

      return;
    }

    if (isSkipped(node)) {
      return;
    }

    if (node.name === "img") {
      images.push({ alt: node.attribs.alt ?? "", src: node.attribs.src ?? "" });
    }

    const level = headingLevels.get(node.name);
    const heading: string[] | undefined = level === undefined ? undefined : [];
    const link = node.name === "a" ? [] : undefined;
    const inner: string[][] = [...captures];

    if (heading !== undefined) {
      inner.push(heading);
    }

    if (link !== undefined) {
      inner.push(link);
    }

    const block = blockTags.has(node.name);

    if (block) {
      parts.push("\n");
    }

    for (const child of node.children) {
      visit(child, inner, collect);
    }

    if (block) {
      parts.push("\n");
    }

    if (heading !== undefined && level !== undefined) {
      headings.push({
        level,
        text: normalizeArticleText(heading.join("")),
      });
    }

    if (link !== undefined) {
      links.push({
        href: node.attribs.href ?? "",
        text: normalizeArticleText(link.join("")),
      });
    }
  };

  for (const child of main.children) {
    visit(child, [], true);
  }

  return {
    headings,
    images,
    links,
    tabLabels,
    text: normalizeArticleText(parts.join("")),
  };
};
