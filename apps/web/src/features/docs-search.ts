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
import { docsSearchExcerptParts } from "./docs-search-excerpt.js";
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
    Idle: () => "",
    Loaded: ({ query, result }) => resultsText(result.total, query),
    Loading: () => "",
  });

const pageIcon = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class(className(docsSearch.pageIcon)),
      h.Width("24"),
      h.Height("24"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
      h.Attribute("focusable", "false"),
    ],
    [
      h.path([
        h.D(
          "M9 10h1a1 1 0 1 0 0-2H9a1 1 0 0 0 0 2Zm0 2a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2H9Zm11-3V8l-6-6a1 1 0 0 0-1 0H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9Zm-6-4 3 3h-2a1 1 0 0 1-1-1V5Zm4 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5v3a3 3 0 0 0 3 3h3v9Zm-3-3H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2Z"
        ),
      ]),
    ]
  );

const clearIcon = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Width("24"),
      h.Height("24"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
      h.Attribute("focusable", "false"),
    ],
    [
      h.path([
        h.D(
          "m13.41 12 6.3-6.29a1 1 0 1 0-1.42-1.42L12 10.59l-6.29-6.3a1 1 0 0 0-1.42 1.42l6.3 6.29-6.3 6.29a1 1 0 0 0 .33 1.64 1 1 0 0 0 1.09-.22l6.29-6.3 6.29 6.3a1 1 0 0 0 1.64-.33 1 1 0 0 0-.22-1.09L13.41 12Z"
        ),
      ]),
    ]
  );

const excerptView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  excerpt: string,
  last: boolean
): Html =>
  h.p(
    [
      h.Class(
        className(
          docsSearch.row,
          last ? docsSearch.rowLast : false,
          docsSearch.excerpt
        )
      ),
    ],
    docsSearchExcerptParts(excerpt, model.docsSearchQuery).map((part) =>
      part.marked
        ? h.mark([h.Class(className(docsSearch.mark))], [part.text])
        : part.text
    )
  );

const sectionView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  routePath: string,
  section: ReturnType<typeof docsSearchMatchesOf>[number]["sections"][number],
  last: boolean
): Html =>
  h.div(
    [
      h.Key(`${routePath}#${section.anchor}`),
      h.Class(
        className(docsSearch.section, last ? docsSearch.sectionLast : false)
      ),
    ],
    [
      h.span([
        h.Class(
          className(docsSearch.treeLine, last ? docsSearch.treeLineLast : false)
        ),
      ]),
      h.span([h.Class(className(docsSearch.treeTick))]),
      h.p(
        [h.Class(className(docsSearch.sectionTitle))],
        [
          h.a(
            [
              h.Href(`${routePath}#${section.anchor}`),
              h.Class(className(docsSearch.sectionLink)),
            ],
            [section.title]
          ),
        ]
      ),
      excerptView(model, h, section.excerpt, last),
    ]
  );

const resultView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  match: ReturnType<typeof docsSearchMatchesOf>[number],
  index: number
): Html => {
  const selected = index === model.docsSearchSelected;
  const { sections } = match;

  return h.li(
    [
      h.Key(match.routePath),
      h.Class(
        className(docsSearch.result, index === 0 ? false : docsSearch.gap)
      ),
    ],
    [
      h.div(
        [h.Class(className(docsSearch.resultInner))],
        [
          h.p(
            [
              h.Class(
                className(
                  docsSearch.row,
                  docsSearch.rowFirst,
                  docsSearch.resultTitle,
                  selected ? docsSearch.resultTitleSelected : false
                )
              ),
            ],
            [
              pageIcon(h),
              h.a(
                [
                  h.Href(match.routePath),
                  h.Class(className(docsSearch.resultLink)),
                  h.Attribute("aria-current", selected ? "true" : "false"),
                ],
                [match.title]
              ),
            ]
          ),
          ...(sections.length === 0
            ? [excerptView(model, h, match.excerpt, true)]
            : sections.map((section, sectionIndex) =>
                sectionView(
                  model,
                  h,
                  match.routePath,
                  section,
                  sectionIndex === sections.length - 1
                )
              )),
        ]
      ),
    ]
  );
};

export const docsSearchDialog = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): Html => {
  const matches = docsSearchMatchesOf(model);
  const total = docsSearchTotalOf(model);
  const summary = summaryText(model);

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
            [
              h.Role("search"),
              h.AriaLabel("Search this site"),
              h.Class(className(docsSearch.form)),
            ],
            [
              h.div(
                [h.Class(className(docsSearch.fieldRow))],
                [
                  docsSearchIcon(h, className(docsSearch.fieldIcon), 15),
                  h.input([
                    h.Class(`${className(docsSearch.field)} docs-search-field`),
                    h.AriaLabel("Search docs"),
                    h.Attribute("title", "Search docs"),
                    h.Value(model.docsSearchQuery),
                    h.Placeholder("Search docs"),
                    h.Attribute("autocapitalize", "none"),
                    h.Attribute("enterkeyhint", "search"),
                    h.Autofocus(true),
                    h.OnInput((value) =>
                      Message.UpdatedDocsSearchQuery({ value })
                    ),
                  ]),
                  ...(model.docsSearchQuery === ""
                    ? []
                    : [
                        h.button(
                          [
                            h.Class(className(docsSearch.clear)),
                            h.AriaLabel("Clear"),
                            h.OnClick(
                              Message.UpdatedDocsSearchQuery({ value: "" })
                            ),
                          ],
                          [clearIcon(h)]
                        ),
                      ]),
                ]
              ),
              ...(summary === "" && matches.length === 0
                ? []
                : [
                    h.div(
                      [h.Class(className(docsSearch.drawer))],
                      [
                        h.div(
                          [h.Class(className(docsSearch.resultsArea))],
                          [
                            ...(summary === ""
                              ? []
                              : [
                                  h.p(
                                    [
                                      h.Class(className(docsSearch.message)),
                                      h.Role("status"),
                                      h.AriaLive("polite"),
                                    ],
                                    [summary]
                                  ),
                                ]),
                            ...(total === 0
                              ? []
                              : [
                                  h.ol(
                                    [h.Class(className(docsSearch.results))],
                                    matches.map((match, index) =>
                                      resultView(model, h, match, index)
                                    )
                                  ),
                                ]),
                          ]
                        ),
                      ]
                    ),
                  ]),
            ]
          ),
        ]
      ),
    ]
  );
};
