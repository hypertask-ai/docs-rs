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

export interface DocsArticleVideo {
  readonly title: string;
  readonly watchUrl: string;
}

export interface DocsArticle {
  readonly headings: readonly DocsArticleHeading[];
  readonly images: readonly DocsArticleImage[];
  readonly links: readonly DocsArticleLink[];
  readonly tabLabels: readonly string[];
  readonly text: string;
  readonly videos: readonly DocsArticleVideo[];
}

interface ArticleState {
  readonly headings: DocsArticleHeading[];
  readonly images: DocsArticleImage[];
  readonly links: DocsArticleLink[];
  readonly parts: string[];
  readonly tabLabels: string[];
  readonly videos: DocsArticleVideo[];
}

export const normalizeArticleText = (value: string) =>
  value.replaceAll("\u00A0", " ").replaceAll(/\s+/gu, " ").trim();

const classesOf = (element: Element) =>
  (element.attribs.class ?? "").split(/\s+/u);

const isSkipped = (element: Element) =>
  skippedTags.has(element.name) ||
  classesOf(element).some((name) => chromeClasses.has(name));

const isTabLabel = (element: Element) =>
  classesOf(element).includes("docs-tab-label") ||
  element.attribs.role === "tab";

const isVideo = (element: Element) =>
  element.name === "a" && classesOf(element).includes("docs-video");

const textOf = (parts: readonly string[]) =>
  normalizeArticleText(parts.join(""));

const writeText = (
  state: ArticleState,
  value: string,
  captures: readonly string[][],
  collect: boolean
) => {
  if (collect) {
    state.parts.push(value);
  }

  for (const capture of captures) {
    capture.push(value);
  }
};

const writeBlockBreak = (state: ArticleState) => {
  state.parts.push("\n");
};

const writeImage = (state: ArticleState, element: Element) => {
  if (element.name === "img") {
    state.images.push({
      alt: element.attribs.alt ?? "",
      src: element.attribs.src ?? "",
    });
  }
};

const writeVideo = (state: ArticleState, element: Element) => {
  state.videos.push({
    title: textOf([DomUtils.textContent(element)]),
    watchUrl: element.attribs.href ?? "",
  });
};

const writeHeading = (
  state: ArticleState,
  level: number | undefined,
  heading: readonly string[] | undefined
) => {
  if (heading !== undefined && level !== undefined) {
    state.headings.push({ level, text: textOf(heading) });
  }
};

const writeLink = (
  state: ArticleState,
  element: Element,
  link: readonly string[] | undefined
) => {
  if (link !== undefined) {
    state.links.push({ href: element.attribs.href ?? "", text: textOf(link) });
  }
};

type Visit = (
  state: ArticleState,
  node: DomNode,
  captures: readonly string[][],
  collect: boolean
) => void;

const writeTabLabel = (
  state: ArticleState,
  element: Element,
  captures: readonly string[][],
  visit: Visit
) => {
  const label: string[] = [];

  for (const child of element.children) {
    visit(state, child, [...captures, label], false);
  }

  state.tabLabels.push(textOf(label));
};

const visitElement = (
  state: ArticleState,
  element: Element,
  captures: readonly string[][],
  collect: boolean,
  visit: Visit
) => {
  if (isTabLabel(element)) {
    writeTabLabel(state, element, captures, visit);

    return;
  }

  if (isVideo(element)) {
    writeVideo(state, element);

    return;
  }

  if (isSkipped(element)) {
    return;
  }

  writeImage(state, element);

  const level = headingLevels.get(element.name);
  const heading = level === undefined ? undefined : [];
  const link = element.name === "a" ? [] : undefined;
  const inner: string[][] = [...captures];
  const block = blockTags.has(element.name);

  if (heading !== undefined) {
    inner.push(heading);
  }

  if (link !== undefined) {
    inner.push(link);
  }

  if (block) {
    writeBlockBreak(state);
  }

  for (const child of element.children) {
    visit(state, child, inner, collect);
  }

  if (block) {
    writeBlockBreak(state);
  }

  writeHeading(state, level, heading);
  writeLink(state, element, link);
};

const visit: Visit = (state, node, captures, collect) => {
  if (node.type === ElementType.Text) {
    writeText(state, node.data, captures, collect);

    return;
  }

  if (node.type === ElementType.Tag) {
    visitElement(state, node, captures, collect, visit);
  }
};

export const docsArticleOf = (html: string, path: string): DocsArticle => {
  const document = parseDocument(html);

  const main = DomUtils.getElementsByTagName("main", document.children).find(
    (element) => element.attribs["data-path"] === path
  );

  if (main === undefined) {
    throw new Error(`The reader page at ${path} has no main element`);
  }

  const state: ArticleState = {
    headings: [],
    images: [],
    links: [],
    parts: [],
    tabLabels: [],
    videos: [],
  };

  for (const child of main.children) {
    visit(state, child, [], true);
  }

  return {
    headings: state.headings,
    images: state.images,
    links: state.links,
    tabLabels: state.tabLabels,
    text: textOf(state.parts),
    videos: state.videos,
  };
};
