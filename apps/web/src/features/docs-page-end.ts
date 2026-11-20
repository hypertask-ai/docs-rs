import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import type { Html, HtmlBuilder } from "foldkit/html";

import { docsChrome } from "./docs-chrome.stylex.js";
import { docsPageAt, docsPageHref, docsPrevNext } from "./docs-page-order.js";
import type { DocsPageOrderEntry } from "./docs-page-order.js";

const className = (...styles: stylex.StyleXStyles[]) =>
  stylex.props(...styles).className ?? "";

const previousArrow =
  "M17 11H9.41l3.3-3.29a1.004 1.004 0 1 0-1.42-1.42l-5 5a1 1 0 0 0-.21.33 1 1 0 0 0 0 .76 1 1 0 0 0 .21.33l5 5a1.002 1.002 0 0 0 1.639-.325 1 1 0 0 0-.219-1.095L9.41 13H17a1 1 0 0 0 0-2Z";

const nextArrow =
  "M17.92 11.62a1.001 1.001 0 0 0-.21-.33l-5-5a1.003 1.003 0 1 0-1.42 1.42l3.3 3.29H7a1 1 0 0 0 0 2h7.59l-3.3 3.29a1.002 1.002 0 0 0 .325 1.639 1 1 0 0 0 1.095-.219l5-5a1 1 0 0 0 .21-.33 1 1 0 0 0 0-.76Z";

const paginationArrow = <Message>(
  direction: "next" | "previous",
  h: HtmlBuilder<Message>
): Html =>
  h.svg(
    [
      h.Width("16"),
      h.Height("16"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
      h.Class(className(docsChrome.paginationArrow)),
    ],
    [h.path([h.D(direction === "previous" ? previousArrow : nextArrow)])]
  );

const paginationLink = <Message>(
  page: DocsPageOrderEntry,
  direction: "next" | "previous",
  h: HtmlBuilder<Message>
): Html =>
  h.a(
    [
      h.Href(docsPageHref(page.path)),
      h.Rel(direction === "previous" ? "prev" : "next"),
      h.Class(
        className(
          docsChrome.paginationLink,
          direction === "next" ? docsChrome.paginationLinkNext : false
        )
      ),
    ],
    [
      paginationArrow(direction, h),
      h.span(
        [h.Class("docs-pagination-label")],
        [
          direction === "previous" ? "Previous" : "Next",
          h.br([]),
          h.span(
            [
              h.Class(
                `${className(docsChrome.paginationTitle)} docs-pagination-title`
              ),
            ],
            [page.label]
          ),
        ]
      ),
    ]
  );

export const docsPagination = <Message>(
  path: string,
  h: HtmlBuilder<Message>
): Html | null =>
  Option.match(docsPageAt(path), {
    onNone: () => null,
    onSome: (page) => {
      if (!page.pagination) {
        return null;
      }

      const { next, previous } = docsPrevNext(path);

      const links = [
        ...Option.match(previous, {
          onNone: () => [],
          onSome: (link) => [paginationLink(link, "previous", h)],
        }),
        ...Option.match(next, {
          onNone: () => [],
          onSome: (link) => [paginationLink(link, "next", h)],
        }),
      ];

      return links.length === 0
        ? null
        : h.nav(
            [
              h.AriaLabel("Previous and next pages"),
              h.Class(`${className(docsChrome.pagination)} docs-pagination`),
            ],
            links
          );
    },
  });
