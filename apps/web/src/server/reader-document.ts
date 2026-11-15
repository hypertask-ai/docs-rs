import { Option, Schema } from "effect";
import * as Server from "foldkit/experimental/server";

import type { ReaderPageFlags } from "../client/reader/model.js";
import { docsHead, docsPageTitleFromDocumentTitle } from "../docs-head.js";
import { readerMetadataHead } from "../reader-metadata.js";

const ReaderDocumentHead = Schema.Struct({ readerHead: Schema.String });

const templateIconHead = [
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  '<link rel="icon" type="image/png" href="/glyph-white.png">',
].join("\n");

const companyHead = [
  `<script src="https://cdn.usefathom.com/script.js" data-site="SSBYTYUQ" defer></script>`,
  `<script src="https://help.hypertask.ai/widget/widget.js" data-mode="floating" defer></script>`,
].join("\n");

const readerHeadFor = (page: ReaderPageFlags): string => {
  const { metadata } = page.page;

  const head = docsHead({
    description: metadata.description,
    noindex: metadata.robots === "noindex",
    origin: page.origin,
    pageTitle: docsPageTitleFromDocumentTitle(metadata.title),
    path: page.page.path,
    status: page.page.status,
  });

  return Option.match(head, {
    onNone: () =>
      [templateIconHead, readerMetadataHead(metadata, page.origin)].join("\n"),
    onSome: (docs) => docs.tags,
  });
};

export const withReaderHead = (
  application: Server.RenderedApplication,
  page: ReaderPageFlags
) => ({
  ...application,
  readerHead: readerHeadFor(page),
});

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: `${companyHead}\n${Schema.decodeUnknownSync(ReaderDocumentHead)(application).readerHead}`,
  });
