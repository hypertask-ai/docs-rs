import { Schema } from "effect";
import * as Server from "foldkit/experimental/server";

import type { ReaderPageFlags } from "../client/reader/model.js";
import { readerMetadataHead } from "../reader-metadata.js";
import { addSiteBasePath } from "../site-base-path.js";

const ReaderDocumentHead = Schema.Struct({ readerHead: Schema.String });

const iconHeadFor = (basePath: string) =>
  [
    `<link rel="icon" type="image/svg+xml" href="${addSiteBasePath(basePath, "/favicon.svg")}">`,
    `<link rel="icon" type="image/png" href="${addSiteBasePath(basePath, "/glyph-white.png")}">`,
  ].join("\n");

const companyHead = [
  `<script src="https://cdn.usefathom.com/script.js" data-site="SSBYTYUQ" defer></script>`,
  `<script src="https://help.hypertask.ai/widget/widget.js" data-mode="floating" defer></script>`,
].join("\n");

export const withReaderHead = (
  application: Server.RenderedApplication,
  page: ReaderPageFlags,
  basePath = ""
) => ({
  ...application,
  readerHead: `${iconHeadFor(basePath)}\n${companyHead}\n${readerMetadataHead(page.page.metadata, page.origin, basePath)}`,
});

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: Schema.decodeUnknownSync(ReaderDocumentHead)(application).readerHead,
  });
