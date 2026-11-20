import { Schema } from "effect";
import * as Server from "foldkit/experimental/server";

import type { ReaderPageFlags } from "../client/reader/model.js";
import { readerMetadataHead } from "../reader-metadata.js";

const ReaderDocumentHead = Schema.Struct({ readerHead: Schema.String });

const iconHead = [
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  '<link rel="icon" type="image/png" href="/glyph-white.png">',
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
  readerHead: readerMetadataHead(page.page.metadata, page.origin, basePath),
});

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets, {
    head: `${iconHead}\n${companyHead}\n${Schema.decodeUnknownSync(ReaderDocumentHead)(application).readerHead}`,
  });
