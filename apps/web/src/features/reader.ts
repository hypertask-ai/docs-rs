import { Button } from "@foldkit/ui";
import * as stylex from "@stylexjs/stylex";
import { Array, Option } from "effect";
import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { Message } from "../client/reader/message.js";
import type { ReaderMessage } from "../client/reader/message.js";
import {
  ClipboardAccess,
  copyStatusOf,
  CopyStatus,
  findCopyPrompt,
  pageCopyId,
} from "../client/reader/model.js";
import type { ReaderModel } from "../client/reader/model.js";
import { docsHead, docsPageTitleFromDocumentTitle } from "../docs-head.js";
import { siteBasePath, siteBuilder } from "../site-base.js";
import {
  docsActions,
  docsBreadcrumb,
  docsFooterNote,
  docsHeader,
  docsMenuButton,
  docsMobileToc,
  docsSidebar,
  docsSkipLink,
  docsToc,
  TOP_ANCHOR_ID,
} from "./docs-chrome.js";
import { docsChrome } from "./docs-chrome.stylex.js";
import { docsPagination } from "./docs-page-end.js";
import { docsHasContentsList } from "./docs-page-order.js";
import { docsGroupForPath, docsPageMarkdownPath } from "./docs-sidebar.js";
import { readerFooter, readerNewsCallout } from "./reader-chrome.js";
import { readerCopyIcon } from "./reader-copy-icon.js";
import { renderReaderBlock } from "./reader-document.js";
import type { SnippetReference } from "./reader-document.js";
import { renderReaderNode } from "./reader-node.js";
import { readerReferences } from "./reader-references.js";
import type {
  ReaderSubviewKey,
  ReaderSubviewResolver,
  ReaderSubviewViews,
} from "./reader-subview-types.js";
import { readerStyles } from "./reader.stylex.js";
import {
  agentGuideRouter,
  glossaryRouter,
  homeRouter,
  isWithinSection,
  learnRouter,
  loreRouter,
  promptsRouter,
  searchRouter,
  skillsRouter,
  systemsRouter,
  tokenmaxxRouter,
} from "./site-route.js";

const copyStatusText = CopyStatus.match({
  Copied: () => "Copied ✓",
  Copying: () => "",
  Failed: () => "Copy failed. Select the text and copy it.",
  Idle: () => "",
});

const sectionIndexes: ReadonlySet<string> = new Set([
  homeRouter(),
  loreRouter(),
  glossaryRouter(),
  systemsRouter(),
  skillsRouter(),
  searchRouter(),
  tokenmaxxRouter(),
]);

const missingReference = (h: HtmlBuilder<ReaderMessage>, description: string) =>
  h.p([h.Class("reader-missing"), h.Role("note")], [description]);

const readerBreadcrumb = (path: string, h: HtmlBuilder<ReaderMessage>) => {
  if (isWithinSection(promptsRouter(), path)) {
    return h.a([h.Href(promptsRouter())], ["prompts"]);
  }

  if (path.startsWith(`${loreRouter()}/`)) {
    return h.a([h.Href(loreRouter())], ["lore"]);
  }

  return h.a([h.Href(homeRouter())], ["source files"]);
};

const footerLinksPrompts = (page: ReaderModel["page"]) =>
  page.status < 400 &&
  (page.path === homeRouter() ||
    page.path === learnRouter() ||
    isWithinSection(loreRouter(), page.path) ||
    isWithinSection(promptsRouter(), page.path));

export const readerCopyControl = (
  model: Pick<ReaderModel, "clipboardAccess" | "copyPrompts" | "copyStatuses">,
  h: HtmlBuilder<ReaderMessage>,
  id: string,
  primary: boolean
) => {
  const status = copyStatusOf(model, id);
  const copied = CopyStatus.guards.Copied(status);

  return Option.match(findCopyPrompt(model, id), {
    onNone: () => missingReference(h, `The ${id} prompt is not in this page.`),
    onSome: (prompt) =>
      h.span(
        [h.Class("copy-actions")],
        [
          Button.view(
            {
              onClick: Message.ClickedCopy({ id }),
              toView: ({ button }) =>
                h.button(
                  [
                    ...button,
                    h.Class(primary ? "copy copy-primary" : "copy"),
                    h.DataAttribute("text", prompt.text),
                    h.AriaLabel(prompt.label),
                    h.Hidden(
                      !ClipboardAccess.guards.Available(model.clipboardAccess)
                    ),
                    h.DataAttribute("copied", String(copied)),
                  ],
                  [
                    readerCopyIcon(h, copied),
                    h.span(
                      [h.Class("copy-label")],
                      [copied ? "Copied ✓" : prompt.label]
                    ),
                  ]
                ),
            },
            h
          ),
          h.span(
            [h.Class("copy-status"), h.Role("status"), h.AriaLive("polite")],
            [copyStatusText(status)]
          ),
        ]
      ),
  });
};

const readerCopyPrompt = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  id: string
) => {
  const control = readerCopyControl(model, h, id, false);

  return Option.match(
    Option.filter(findCopyPrompt(model, id), (prompt) => prompt.showText),
    {
      onNone: () => control,
      onSome: (prompt) =>
        h.div(
          [h.Class("prompt")],
          [
            control,
            h.details(
              [h.Class("prompt-text")],
              [
                h.summary([], ["See the prompt"]),
                h.pre([], [h.code([], [prompt.text])]),
              ]
            ),
          ]
        ),
    }
  );
};

const builtSnippet = (h: HtmlBuilder<ReaderMessage>, html: string) =>
  h.div([h.Class("reader-snippet"), h.InnerHTML(html)]);

const readerCodeFence = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  value: string
) =>
  Option.match(
    Array.findFirst(model.codeFences, (fence) => fence.value === value),
    {
      onNone: () =>
        missingReference(h, "This code block is not in the built page."),
      onSome: ({ html }) => builtSnippet(h, html),
    }
  );

const readerSnippet = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  reference: SnippetReference
) =>
  Option.match(
    Array.findFirst(
      model.snippets,
      (snippet) =>
        snippet.repo === reference.repo &&
        snippet.path === reference.path &&
        snippet.at === reference.at &&
        snippet.lines === reference.lines
    ),
    {
      onNone: () =>
        missingReference(
          h,
          `The excerpt ${reference.path} lines ${reference.lines} is not in the built page.`
        ),
      onSome: ({ html }) => builtSnippet(h, html),
    }
  );

const agentPointer = (model: ReaderModel, h: HtmlBuilder<ReaderMessage>) =>
  h.p(
    [h.Class("agent-pointer visually-hidden"), h.AriaHidden(true)],
    [
      "For agents: start with the ",
      h.a(
        [h.Href(`${model.origin}${agentGuideRouter()}`), h.Tabindex(-1)],
        ["agent guide"]
      ),
      ". Every page is Markdown by default; add Accept: text/html for HTML.",
    ]
  );

const breadcrumbView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): readonly Html[] =>
  sectionIndexes.has(model.page.path)
    ? []
    : [
        h.nav(
          [h.AriaLabel("Breadcrumb"), h.Class("breadcrumb")],
          [
            Option.match(model.breadcrumb, {
              onNone: () => readerBreadcrumb(model.page.path, h),
              onSome: (breadcrumb) =>
                h.a([h.Href(breadcrumb.href)], [breadcrumb.label]),
            }),
            ` / ${Option.match(model.breadcrumb, {
              onNone: () => model.heading,
              onSome: (breadcrumb) => breadcrumb.name,
            })}`,
          ]
        ),
      ];

const bodyView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  subview: ReaderSubviewResolver
) => [
  ...Option.match(model.bodyNodes, {
    onNone: () => [h.h1([], [model.heading])],
    onSome: (nodes) =>
      nodes.map((node) =>
        renderReaderNode(node, h, (id, primary) =>
          readerCopyControl(model, h, id, primary)
        )
      ),
  }),
  ...Option.match(model.cafe, {
    onNone: () => [],
    onSome: (cafe) => [
      h.submodel({
        model: cafe,
        slotId: "cafe",
        toParentMessage: (message) => Message.GotCafeMessage({ message }),
        view: subview("cafe"),
      }),
    ],
  }),
  ...Option.match(model.docs, {
    onNone: () => [],
    onSome: (docs) => [
      h.submodel({
        model: docs,
        slotId: "docs",
        toParentMessage: (message) => Message.GotDocsMessage({ message }),
        view: subview("docs"),
      }),
    ],
  }),
  ...Option.match(model.motion, {
    onNone: () => [],
    onSome: (motion) => [
      h.submodel({
        model: motion,
        slotId: "motion",
        toParentMessage: (message) => Message.GotMotionMessage({ message }),
        view: subview("motion"),
      }),
    ],
  }),
  ...Option.match(model.tube, {
    onNone: () => [],
    onSome: (tube) => [
      h.submodel({
        model: tube,
        slotId: "tube",
        toParentMessage: (message) => Message.GotTubeMessage({ message }),
        view: subview("tube"),
      }),
    ],
  }),
  ...model.blocks.map((block) =>
    renderReaderBlock(block, h, {
      anchors: Option.match(model.references, {
        onNone: () => [],
        onSome: (references) => references.anchors,
      }),
      codeFence: (value) => readerCodeFence(model, h, value),
      copyPrompt: (id) => readerCopyPrompt(model, h, id),
      inboundCounts: Option.match(model.references, {
        onNone: () => ({}),
        onSome: (references) => references.inboundCounts,
      }),
      pagePath: model.page.path,
      snippet: (reference) => readerSnippet(model, h, reference),
    })
  ),
];

const bibliographyView = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>
): readonly Html[] =>
  Array.match(model.bibliography, {
    onEmpty: () => [],
    onNonEmpty: (sources) => [
      h.section(
        [h.AriaLabelledBy("sources"), h.Class("bibliography")],
        [
          h.h2([h.Id("sources")], ["Sources"]),
          h.ol(
            [],
            sources.map((source, index) =>
              h.li(
                [h.Id(`source-${index + 1}`)],
                source.kind === "linked"
                  ? [
                      h.a([h.Href(source.url)], [source.title]),
                      `. ${source.publisher}. ${source.note} Accessed ${source.accessed}.`,
                    ]
                  : [
                      `${source.title}. Recorded ${source.recordedAt}. ${source.note}.`,
                    ]
              )
            )
          ),
        ]
      ),
    ],
  });

const readerDocument = (
  model: ReaderModel,
  h: HtmlBuilder<ReaderMessage>,
  subview: ReaderSubviewResolver
): Document => {
  const group = docsGroupForPath(model.page.path);

  const toc = docsHasContentsList(model.page.path)
    ? Option.match(model.references, {
        onNone: () => null,
        onSome: (references) => docsToc(references.anchors, h),
      })
    : null;

  const pagination = docsPagination(model.page.path, h);

  const mobileToc = docsMobileToc(
    model,
    {
      onEscape: () => Message.PressedEscapeInMobileToc(),
      onSelect: () => Message.ClickedMobileTocLink(),
      onToggle: () => Message.ClickedMobileTocToggle(),
    },
    h
  );

  const shellClass = `${stylex.props(readerStyles.shell).className ?? ""} docs-layout`;
  const kickerClass = `${stylex.props(docsChrome.kicker).className ?? ""} docs-kicker`;

  const body = h.div(
    [
      h.Class(shellClass),
      h.DataAttribute("mobile-nav", model.mobileNav.open ? "open" : "closed"),
      h.OnKeyDownPreventDefault((key) =>
        key === "Escape" && model.mobileNav.open
          ? Option.some(Message.PressedEscapeInMobileNav())
          : Option.none()
      ),
    ],
    [
      docsSkipLink(h),
      docsHeader(model.page.path, h),
      docsMenuButton(
        model.mobileNav.open,
        () => Message.ClickedMobileNavToggle(),
        h
      ),
      ...(mobileToc === null ? [] : [mobileToc]),
      ...(group === undefined
        ? []
        : [docsBreadcrumb(model.page.path, model.heading, h)]),
      h.div(
        [h.Class("docs-body")],
        [
          docsSidebar(model.page.path, h),
          h.div(
            [h.Class("docs-pane")],
            [
              docsActions(
                {
                  copyStatus: copyStatusOf(model, pageCopyId),
                  markdownUrl: `${model.origin}${docsPageMarkdownPath(model.page.path)}`,
                  onCopyPage: () => Message.ClickedCopyPage(),
                },
                h
              ),
              ...(group === undefined
                ? []
                : [h.div([h.Class(kickerClass)], [group.label])]),
              h.main(
                [
                  h.Id(TOP_ANCHOR_ID),
                  h.DataAttribute("path", model.page.path),
                  h.Class("docs-main"),
                ],
                [
                  ...(group === undefined ? [agentPointer(model, h)] : []),
                  ...Option.match(model.newsTitle, {
                    onNone: () => [],
                    onSome: (title) => [readerNewsCallout(title, h)],
                  }),
                  ...(group === undefined ? breadcrumbView(model, h) : []),
                  ...bodyView(model, h, subview),
                  ...bibliographyView(model, h),
                  ...readerReferences(model, h),
                ]
              ),
              ...(pagination === null ? [] : [pagination]),
              readerFooter(h, footerLinksPrompts(model.page)),
            ]
          ),
          ...(toc === null ? [] : [toc]),
        ]
      ),
      docsFooterNote(h),
    ]
  );

  const head = docsHead({
    description: model.page.metadata.description,
    noindex: model.page.metadata.robots === "noindex",
    origin: model.origin,
    pageTitle: docsPageTitleFromDocumentTitle(model.page.metadata.title),
    path: model.page.path,
    status: model.page.status,
  });

  return Option.match(head, {
    onNone: () => ({
      body,
      canonical: `${model.origin}${model.page.metadata.canonicalPath}`,
      ogUrl: `${model.origin}${model.page.metadata.canonicalPath}`,
      title: model.page.metadata.title,
    }),
    onSome: (docs) => ({
      body,
      canonical: docs.canonical,
      lang: docs.lang,
      ogUrl: docs.ogUrl,
      title: docs.title,
    }),
  });
};

const buildSubviewResolver =
  (subviews: Partial<ReaderSubviewViews>): ReaderSubviewResolver =>
  <K extends ReaderSubviewKey>(key: K) => {
    const candidate = subviews[key];

    if (candidate === undefined) {
      throw new Error(`Reader subview ${key} is not available`);
    }

    return candidate;
  };

export const buildReaderViewAt =
  (subviews: Partial<ReaderSubviewViews>, basePath: string) =>
  (model: ReaderModel, h: HtmlBuilder<ReaderMessage>): Document =>
    readerDocument(
      model,
      siteBuilder(basePath, h),
      buildSubviewResolver(subviews)
    );

export const buildReaderView = (subviews: Partial<ReaderSubviewViews>) =>
  buildReaderViewAt(subviews, siteBasePath);
