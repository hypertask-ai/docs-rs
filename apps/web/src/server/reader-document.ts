import { Schema } from "effect";
import * as Server from "foldkit/experimental/server";

import faviconUrl from "../assets/favicon.svg?url";
import glyphUrl from "../assets/glyph-white.png?url";
import type { ReaderPageFlags } from "../client/reader/model.js";
import { readerMetadataHead } from "../reader-metadata.js";

const ReaderDocumentHead = Schema.Struct({ readerHead: Schema.String });

const iconHead = [
  `<link rel="icon" type="image/svg+xml" href="${faviconUrl}">`,
  `<link rel="icon" type="image/png" href="${glyphUrl}">`,
].join("\n");

const companyHead = [
  `<script src="https://cdn.usefathom.com/script.js" data-site="SSBYTYUQ" defer></script>`,
  `<script src="https://help.hypertask.ai/widget/widget.js" data-mode="floating" defer></script>`,
].join("\n");

export const withReaderHead = (
  application: Server.RenderedApplication,
  page: ReaderPageFlags
) => ({
  ...application,
  readerHead: readerMetadataHead(page.page.metadata, page.origin),
});

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: `${iconHead}\n${companyHead}\n${Schema.decodeUnknownSync(ReaderDocumentHead)(application).readerHead}`,
  });
