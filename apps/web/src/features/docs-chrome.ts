import { Button } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import type { Html, HtmlBuilder } from "foldkit/html";

import { CopyStatus } from "../client/reader/model.js";
import { docsChrome } from "./docs-chrome.stylex.js";
import { docsSearchDialogId } from "./docs-search.js";
import {
  docsHeaderLinks,
  docsHeaderTabs,
  docsSidebarGroups,
} from "./docs-sidebar.js";
import type { DocsSidebarGroup } from "./docs-sidebar.js";
import { homeRouter } from "./site-route.js";

const className = (...styles: stylex.StyleXStyles[]) =>
  stylex.props(...styles).className ?? "";

const activeTab = (active: boolean) => (active ? docsChrome.tabActive : false);

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
      h.Class(className(docsChrome.groupCaret)),
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
      h.div(
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
                  h.Href(item.path),
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
          h.button(
            [
              h.Class(`${className(docsChrome.search)} docs-search`),
              h.AriaLabel("Search docs"),
              h.Attribute("aria-keyshortcuts", "Control+K"),
              h.Attribute("command", "show-modal"),
              h.Attribute("commandfor", docsSearchDialogId),
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
          h.a(
            [
              h.Key(tab.path),
              h.Href(tab.path),
              h.Class(className(docsChrome.tab, activeTab(tab.isActive(path)))),
              h.Attribute(
                "aria-current",
                tab.isActive(path) ? "page" : "false"
              ),
            ],
            [tab.label]
          )
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
                h.Class(className(docsChrome.action)),
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
          h.Class(className(docsChrome.action)),
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
          h.Class(className(docsChrome.action)),
          h.Rel("noopener"),
          h.Attribute("target", "_blank"),
        ],
        ["Open in ChatGPT"]
      ),
      h.a(
        [
          h.Href(options.markdownUrl),
          h.Class(className(docsChrome.action, docsChrome.actionGhost)),
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
