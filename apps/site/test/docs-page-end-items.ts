import { DomUtils, parseDocument } from "htmlparser2";

export interface DocsContentsItem {
  readonly current: boolean;
  readonly href: string;
  readonly text: string;
}

export interface DocsPaginationItem {
  readonly href: string;
  readonly label: string;
  readonly rel: string;
  readonly text: string;
}

const hasClass = (
  element: Parameters<typeof DomUtils.getAttributeValue>[0],
  name: string
): boolean => (element.attribs.class ?? "").split(/\s+/u).includes(name);

const text = (element: Parameters<typeof DomUtils.textContent>[0]): string =>
  DomUtils.textContent(element).replaceAll(/\s+/gu, " ").trim();

export const docsContentsItems = (
  html: string
): readonly DocsContentsItem[] => {
  const document = parseDocument(html);

  const nav = DomUtils.findOne(
    (element) => element.attribs.id === "docs-toc",
    document.children
  );

  if (nav === null) {
    return [];
  }

  return DomUtils.getElementsByTagName("a", nav.children).map((anchor) => ({
    current: anchor.attribs["aria-current"] === "true",
    href: anchor.attribs.href ?? "",
    text: text(anchor),
  }));
};

export const docsPaginationItems = (
  html: string
): readonly DocsPaginationItem[] => {
  const document = parseDocument(html);

  const container = DomUtils.findOne(
    (element) => hasClass(element, "docs-pagination"),
    document.children
  );

  if (container === null) {
    return [];
  }

  return DomUtils.getElementsByTagName("a", container.children).map(
    (anchor) => {
      const title = DomUtils.findOne(
        (element) => hasClass(element, "docs-pagination-title"),
        anchor.children
      );

      const label = title === null ? "" : text(title);

      const full = text(anchor);

      return {
        href: anchor.attribs.href ?? "",
        label,
        rel: anchor.attribs.rel ?? "",
        text: label === "" ? full : full.slice(0, -label.length).trim(),
      };
    }
  );
};

export const docsFooterText = (html: string): string | null => {
  const document = parseDocument(html);

  const footer = DomUtils.findOne(
    (element) => hasClass(element, "docs-footer-note"),
    document.children
  );

  return footer === null ? null : text(footer);
};
