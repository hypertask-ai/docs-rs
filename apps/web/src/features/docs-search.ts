import * as stylex from "@stylexjs/stylex";
import type { Html, HtmlBuilder } from "foldkit/html";

import { docsSearchKeyMessage, Message } from "../client/reader/message.js";
import type { ReaderMessage } from "../client/reader/message.js";
import {
  DocsSearchState,
  docsSearchMatchesOf,
  docsSearchTotalOf,
} from "../client/reader/model.js";
import type { ReaderModel } from "../client/reader/model.js";
import { docsSearchIcon } from "./docs-search-icon.js";
import { docsSearch } from "./docs-search.stylex.js";

export const docsSearchDialogId = "docs-search";

const className = (...styles: stylex.StyleXStyles[]) =>
  stylex.props(...styles).className ?? "";

const resultsText = (total: number, query: string): string => {
  if (total === 0) {
    return `No results for ${query}`;
  }

  return total === 1
    ? `1 result for ${query}`
    : `${total} results for ${query}`;
};

const summaryText = (model: ReaderModel): string =>
  DocsSearchState.match(model.docsSearch, {
    Failed: () => "Search failed. Try again in a moment.",
    Idle: () => "Type to search the docs.",
    Loaded: ({ query, result }) => resultsText(result.total, query),
    Loading: ({ query }) => `Searching for ${query}...`,
  });

const resultView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  match: ReturnType<typeof docsSearchMatchesOf>[number],
  index: number,
  last: boolean
): Html =>
  h.li(
    [
      h.Key(match.routePath),
      h.Class(
        className(
          docsSearch.item,
          last ? docsSearch.itemLast : false,
          index === model.docsSearchSelected ? docsSearch.itemSelected : false
        )
      ),
    ],
    [
      h.a(
        [
          h.Href(match.routePath),
          h.Class(className(docsSearch.title)),
          h.Attribute(
            "aria-current",
            index === model.docsSearchSelected ? "true" : "false"
          ),
        ],
        [match.title]
      ),
      h.p([h.Class(className(docsSearch.excerpt))], [match.excerpt]),
      ...(match.sections.length === 0
        ? []
        : [
            h.ul(
              [h.Class(className(docsSearch.sections))],
              match.sections
                .slice(0, 3)
                .map((section) =>
                  h.li(
                    [h.Key(`${match.routePath}#${section.anchor}`)],
                    [
                      h.a(
                        [
                          h.Href(`${match.routePath}#${section.anchor}`),
                          h.Class(className(docsSearch.sectionLink)),
                        ],
                        ["⤷ ", section.title]
                      ),
                      h.p(
                        [h.Class(className(docsSearch.excerpt))],
                        [section.excerpt]
                      ),
                    ]
                  )
                )
            ),
          ]),
    ]
  );

export const docsSearchDialog = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): Html => {
  const matches = docsSearchMatchesOf(model);
  const shown = matches.slice(0, model.docsSearchShown);
  const total = docsSearchTotalOf(model);

  return h.dialog(
    [
      h.Id(docsSearchDialogId),
      h.AriaLabel("Search docs"),
      h.Attribute("closedby", "any"),
      h.Class(`${className(docsSearch.panel)} docs-search-panel`),
      h.OnKeyDownPreventDefault((key) => docsSearchKeyMessage(key)),
    ],
    [
      h.div(
        [h.Class(className(docsSearch.panelFrame))],
        [
          h.button(
            [
              h.Class(`${className(docsSearch.close)} docs-search-close`),
              h.Attribute("command", "close"),
              h.Attribute("commandfor", docsSearchDialogId),
            ],
            ["Cancel"]
          ),
          h.div(
            [h.Class(className(docsSearch.fieldRow))],
            [
              docsSearchIcon(h, className(docsSearch.fieldIcon), 18),
              h.input([
                h.Class(className(docsSearch.field)),
                h.Type("search"),
                h.Value(model.docsSearchQuery),
                h.Placeholder("Search docs"),
                h.AriaLabel("Search this site"),
                h.Autofocus(true),
                h.OnInput((value) => Message.UpdatedDocsSearchQuery({ value })),
              ]),
              h.button(
                [
                  h.Class(className(docsSearch.cancel)),
                  h.OnClick(Message.UpdatedDocsSearchQuery({ value: "" })),
                ],
                ["Cancel"]
              ),
            ]
          ),
          h.p(
            [
              h.Class(className(docsSearch.message)),
              h.Role("status"),
              h.AriaLive("polite"),
            ],
            [summaryText(model)]
          ),
          ...(shown.length === 0
            ? [
                h.p(
                  [h.Class(className(docsSearch.empty))],
                  [
                    DocsSearchState.guards.Loaded(model.docsSearch)
                      ? "Try a shorter word or another term."
                      : "Results will appear as you type.",
                  ]
                ),
              ]
            : [
                h.ol(
                  [h.Class(className(docsSearch.list))],
                  shown.map((match, index) =>
                    resultView(
                      model,
                      h,
                      match,
                      index,
                      index === shown.length - 1
                    )
                  )
                ),
              ]),
          ...(total > shown.length
            ? [
                h.button(
                  [
                    h.Class(className(docsSearch.more)),
                    h.OnClick(Message.ShowedMoreDocsSearchResults()),
                  ],
                  ["Load more results"]
                ),
              ]
            : []),
        ]
      ),
    ]
  );
};
