import { DomUtils, parseDocument } from "htmlparser2";

export interface DocsHeaderAnchorItem {
  readonly attributes: Readonly<Record<string, string>>;
  readonly parts: readonly string[];
  readonly text: string;
}

export interface DocsHeaderImageItem {
  readonly attributes: Readonly<Record<string, string>>;
}

const docsHeaderElement = (html: string) => {
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

  return header;
};

export const docsHeaderAnchorItems = (
  html: string
): readonly DocsHeaderAnchorItem[] =>
  DomUtils.getElementsByTagName("a", docsHeaderElement(html).children).map(
    (element) => ({
      attributes: element.attribs,
      parts: DomUtils.getChildren(element)
        .map((child) => DomUtils.textContent(child).trim())
        .filter((part) => part !== ""),
      text: DomUtils.textContent(element).trim(),
    })
  );

export const docsHeaderImageItems = (
  html: string
): readonly DocsHeaderImageItem[] =>
  DomUtils.getElementsByTagName("img", docsHeaderElement(html).children).map(
    (element) => ({ attributes: element.attribs })
  );
