import { Button } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Option } from "effect";
import type { Attribute, Html, HtmlBuilder } from "foldkit/html";

import { CopyStatus, currentAnchorText } from "../client/reader/model.js";
import type { ReaderModel } from "../client/reader/model.js";
import { docsChrome } from "./docs-chrome.stylex.js";
import {
  docsHeaderLinks,
  docsHeaderTabs,
  docsHref,
  docsSidebarGroups,
} from "./docs-sidebar.js";
import type { DocsHeaderTab, DocsSidebarGroup } from "./docs-sidebar.js";
import { homeRouter, searchRouter } from "./site-route.js";

const className = (...styles: stylex.StyleXStyles[]) =>
  stylex.props(...styles).className ?? "";

export const TOP_ANCHOR_ID = "_top";

const activeTab = (active: boolean) => (active ? docsChrome.tabActive : false);

const tabAttributes = <Message>(
  tab: DocsHeaderTab,
  path: string,
  h: HtmlBuilder<Message>
): readonly Attribute<Message>[] => {
  const attributes: readonly Attribute<Message>[] = [
    h.Key(tab.path),
    h.Href(docsHref(tab.path)),
    h.Class(className(docsChrome.tab, activeTab(tab.isActive(path)))),
  ];

  return tab.isActive(path)
    ? [...attributes, h.AriaCurrent("page")]
    : attributes;
};

const activeLink = (current: boolean) =>
  current ? docsChrome.sidebarLinkActive : false;

const copyLabel = CopyStatus.match({
  Copied: () => "Copied",
  Copying: () => "Copy page",
  Failed: () => "Copy failed",
  Idle: () => "Copy page",
});

const searchIcon = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class("docs-search-icon"),
      h.Width("16"),
      h.Height("16"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
    ],
    [
      h.path([
        h.D(
          "M21.71 20.29 18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a.999.999 0 0 0 1.42 0 1 1 0 0 0 0-1.39ZM11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
        ),
      ]),
    ]
  );

const copyIcon = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Width("14"),
      h.Height("14"),
      h.ViewBox("0 0 24 24"),
      h.Fill("none"),
      h.Stroke("currentColor"),
      h.StrokeWidth("2"),
      h.StrokeLinecap("round"),
      h.StrokeLinejoin("round"),
      h.AriaHidden(true),
    ],
    [
      h.rect([
        h.X("9"),
        h.Y("9"),
        h.Width("13"),
        h.Height("13"),
        h.Rx("2"),
        h.Attribute("ry", "2"),
      ]),
      h.path([h.D("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1")]),
    ]
  );

const groupCaret = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class(`${className(docsChrome.groupCaret)} docs-group-caret`),
      h.Width("16"),
      h.Height("16"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
    ],
    [
      h.path([
        h.D(
          "m14.83 11.29-4.24-4.24a1 1 0 1 0-1.42 1.41L12.71 12l-3.54 3.54a1 1 0 0 0 0 1.41 1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.24-4.24a1.002 1.002 0 0 0 0-1.42Z"
        ),
      ]),
    ]
  );

const sidebarGroup = <Message>(
  group: DocsSidebarGroup,
  path: string,
  h: HtmlBuilder<Message>
) =>
  h.li(
    [h.Key(group.label)],
    [
      h.details(
        [h.Open(true), h.Class("docs-group")],
        [
          h.summary(
            [h.Class(className(docsChrome.groupLabel))],
            [h.span([], [group.label]), groupCaret(h)]
          ),
          h.ul(
            [h.Class(className(docsChrome.groupList))],
            group.items.map((item) =>
              h.li(
                [h.Key(item.path)],
                [
                  h.a(
                    [
                      h.Href(docsHref(item.path)),
                      h.Class(
                        className(
                          docsChrome.sidebarLink,
                          activeLink(item.path === path)
                        )
                      ),
                      h.Attribute(
                        "aria-current",
                        item.path === path ? "page" : "false"
                      ),
                    ],
                    [item.label]
                  ),
                ]
              )
            )
          ),
        ]
      ),
    ]
  );

export const docsHeader = <Message>(
  path: string,
  h: HtmlBuilder<Message>
): Html =>
  h.header(
    [h.Class(`${className(docsChrome.header)} docs-header`)],
    [
      h.div(
        [h.Class(`${className(docsChrome.headerMain)} docs-header-main`)],
        [
          h.a(
            [h.Href(homeRouter()), h.Class(className(docsChrome.brand))],
            [
              h.img([
                h.Src("/glyph-white.png"),
                h.Alt(""),
                h.Width("22"),
                h.Height("26"),
                h.Class(className(docsChrome.glyph)),
              ]),
              h.span([h.Class(className(docsChrome.wordmark))], ["Hypertask"]),
              h.span([h.Class(className(docsChrome.docsLabel))], ["Docs"]),
            ]
          ),
          h.a(
            [
              h.Href(searchRouter()),
              h.Class(`${className(docsChrome.search)} docs-search`),
              h.AriaLabel("Search docs"),
              h.Attribute("aria-keyshortcuts", "Control+K"),
            ],
            [
              searchIcon(h),
              h.span([h.Class("docs-search-label")], ["Search docs"]),
              h.span(
                [h.Class(`${className(docsChrome.kbd)} docs-kbd`)],
                ["Ctrl K"]
              ),
            ]
          ),
          h.div(
            [h.Class(`${className(docsChrome.headerLinks)} docs-header-links`)],
            docsHeaderLinks.map((link) =>
              h.a(
                [
                  h.Href(link.path),
                  h.Class(
                    className(
                      link.openApp ? docsChrome.openApp : docsChrome.textLink
                    )
                  ),
                ],
                [link.label]
              )
            )
          ),
        ]
      ),
      h.nav(
        [
          h.AriaLabel("Documentation sections"),
          h.Class(`${className(docsChrome.tabs)} docs-section-tabs`),
        ],
        docsHeaderTabs.map((tab) =>
          h.a(tabAttributes(tab, path, h), [tab.label])
        )
      ),
    ]
  );

export const docsSidebar = <Message>(
  path: string,
  h: HtmlBuilder<Message>
): Html =>
  h.nav(
    [
      h.AriaLabel("Main"),
      h.Class(className(docsChrome.sidebar)),
      h.Id("docs-sidebar"),
    ],
    [
      h.ul(
        [h.Class(className(docsChrome.groupList))],
        docsSidebarGroups.map((group) => sidebarGroup(group, path, h))
      ),
    ]
  );

export const docsMenuButton = <Message>(
  open: boolean,
  onToggle: () => Message,
  h: HtmlBuilder<Message>
): Html =>
  h.button(
    [
      h.Id("docs-menu-button"),
      h.Class("docs-menu-button"),
      h.Attribute("type", "button"),
      h.AriaLabel("Menu"),
      h.AriaExpanded(open),
      h.AriaControls("docs-sidebar"),
      h.OnClick(onToggle()),
    ],
    [
      h.svg(
        [
          h.Class("docs-menu-icon docs-menu-open"),
          h.Width("16"),
          h.Height("16"),
          h.ViewBox("0 0 24 24"),
          h.Fill("currentColor"),
          h.AriaHidden(true),
        ],
        [
          h.path([
            h.D(
              "M3 8h18a1 1 0 1 0 0-2H3a1 1 0 0 0 0 2Zm18 8H3a1 1 0 0 0 0 2h18a1 1 0 0 0 0-2Zm0-5H3a1 1 0 0 0 0 2h18a1 1 0 0 0 0-2Z"
            ),
          ]),
        ]
      ),
      h.svg(
        [
          h.Class("docs-menu-icon docs-menu-close"),
          h.Width("16"),
          h.Height("16"),
          h.ViewBox("0 0 24 24"),
          h.Fill("currentColor"),
          h.AriaHidden(true),
        ],
        [
          h.path([
            h.D(
              "m13.41 12 6.3-6.29a1.004 1.004 0 1 0-1.42-1.42L12 10.59l-6.29-6.3a1.004 1.004 0 0 0-1.42 1.42l6.3 6.29-6.3 6.29a1 1 0 0 0 0 1.42.998.998 0 0 0 1.42 0l6.29-6.3 6.29 6.3a.999.999 0 0 0 1.42 0 1 1 0 0 0 0-1.42L13.41 12Z"
            ),
          ]),
        ]
      ),
    ]
  );

export const docsBreadcrumb = <Message>(
  path: string,
  title: string,
  h: HtmlBuilder<Message>
): Html =>
  h.div(
    [h.Class("docs-breadcrumb")],
    [
      docsHeaderTabs.find((tab) => tab.isActive(path))?.label ??
        "Getting started",
      " ",
      h.span([h.AriaHidden(true)], ["\u203A"]),
      " ",
      h.span([], [title]),
    ]
  );

const tocCaret = <Message>(h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class("docs-mobile-toc-caret"),
      h.Width("16"),
      h.Height("16"),
      h.ViewBox("0 0 24 24"),
      h.Fill("currentColor"),
      h.AriaHidden(true),
    ],
    [
      h.path([
        h.D(
          "m14.83 11.29-4.24-4.24a1 1 0 1 0-1.42 1.41L12.71 12l-3.54 3.54a1 1 0 0 0 0 1.41 1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.24-4.24a1.002 1.002 0 0 0 0-1.42Z"
        ),
      ]),
    ]
  );

export const docsMobileToc = <Message>(
  model: Pick<
    ReaderModel,
    "heading" | "mobileToc" | "readingAnchorId" | "references"
  >,
  options: {
    readonly onEscape: () => Message;
    readonly onSelect: () => Message;
    readonly onToggle: () => Message;
  },
  h: HtmlBuilder<Message>
): Html => {
  const anchors = [
    { id: TOP_ANCHOR_ID, text: model.heading },
    ...Option.match(model.references, {
      onNone: () => [],
      onSome: (references) => references.anchors,
    }),
  ];

  const currentId = Option.getOrElse(
    model.readingAnchorId,
    () => TOP_ANCHOR_ID
  );

  return h.div(
    [h.Class("docs-toc-slot")],
    [
      h.nav(
        [h.AriaLabelledBy("docs-mobile-toc-summary"), h.Class("docs-toc-bar")],
        [
          h.details(
            [
              h.Id("docs-mobile-toc"),
              h.Class("docs-mobile-toc"),
              h.Open(model.mobileToc.open),
              h.OnKeyDownPreventDefault((key) =>
                key === "Escape"
                  ? Option.some(options.onEscape())
                  : Option.none()
              ),
            ],
            [
              h.summary(
                [
                  h.Id("docs-mobile-toc-summary"),
                  h.Class("docs-mobile-toc-summary"),
                  h.OnClick(options.onToggle()),
                ],
                [
                  h.span(
                    [h.Class("docs-mobile-toc-toggle")],
                    ["On this page", tocCaret(h)]
                  ),
                  h.span(
                    [h.Class("docs-mobile-toc-current")],
                    [currentAnchorText(model)]
                  ),
                ]
              ),
              h.div(
                [h.Class("docs-mobile-toc-dropdown")],
                [
                  h.ul(
                    [h.Class("docs-mobile-toc-list")],
                    anchors.map((anchor) =>
                      h.li(
                        [h.Key(anchor.id)],
                        [
                          h.a(
                            [
                              h.Href(`#${anchor.id}`),
                              h.Class("docs-mobile-toc-link"),
                              h.Attribute(
                                "aria-current",
                                anchor.id === currentId ? "true" : "false"
                              ),
                              h.OnClick(options.onSelect()),
                            ],
                            [anchor.text]
                          ),
                        ]
                      )
                    )
                  ),
                ]
              ),
            ]
          ),
        ]
      ),
    ]
  );
};

export const docsToc = <Message>(
  anchors: readonly { readonly id: string; readonly text: string }[],
  h: HtmlBuilder<Message>
): Html | null =>
  anchors.length === 0
    ? null
    : h.nav(
        [
          h.AriaLabel("On this page"),
          h.Class(className(docsChrome.toc)),
          h.Id("docs-toc"),
        ],
        [
          h.p([h.Class(className(docsChrome.tocHeading))], ["On this page"]),
          h.ul(
            [h.Class(className(docsChrome.groupList))],
            anchors.map((anchor) =>
              h.li(
                [h.Key(anchor.id)],
                [
                  h.a(
                    [
                      h.Href(`#${anchor.id}`),
                      h.Class(className(docsChrome.tocLink)),
                    ],
                    [anchor.text]
                  ),
                ]
              )
            )
          ),
        ]
      );

export const docsActions = <Message>(
  options: {
    readonly copyStatus: typeof CopyStatus.Type;
    readonly markdownUrl: string;
    readonly onCopyPage: () => Message;
  },
  h: HtmlBuilder<Message>
): Html => {
  const label = copyLabel(options.copyStatus);
  const prompt = `Read ${options.markdownUrl} and help me with questions about this page.`;

  return h.div(
    [
      h.Class(className(docsChrome.actions)),
      h.DataAttribute("md-url", options.markdownUrl),
    ],
    [
      Button.view(
        {
          onClick: options.onCopyPage(),
          toView: ({ button }) =>
            h.button(
              [
                ...button,
                h.Class(`${className(docsChrome.action)} docs-action`),
                h.AriaLabel("Copy page as markdown"),
              ],
              [
                copyIcon(h),
                h.span([h.DataAttribute("copy-label", "")], [label]),
              ]
            ),
        },
        h
      ),
      h.a(
        [
          h.Href(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`),
          h.Class(`${className(docsChrome.action)} docs-action`),
          h.Rel("noopener"),
          h.Attribute("target", "_blank"),
        ],
        ["Open in Claude"]
      ),
      h.a(
        [
          h.Href(
            `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`
          ),
          h.Class(`${className(docsChrome.action)} docs-action`),
          h.Rel("noopener"),
          h.Attribute("target", "_blank"),
        ],
        ["Open in ChatGPT"]
      ),
      h.a(
        [
          h.Href(options.markdownUrl),
          h.Class(
            `${className(docsChrome.action, docsChrome.actionGhost)} docs-action`
          ),
          h.Title("View raw markdown"),
        ],
        ["View as markdown"]
      ),
    ]
  );
};

export const docsFooterNote = <Message>(h: HtmlBuilder<Message>) =>
  h.p(
    [h.Class(`${className(docsChrome.footerNote)} docs-footer-note`)],
    ["© 2026 Hypertask Lab Ltd."]
  );
