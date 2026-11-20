import { DocsSearchOutput } from "@rat-stack/core/contracts";
import { Array, Option, Record, Schema } from "effect";
import { defineTaggedUnion } from "foldkit/schema";

import { bibliographySourceSchema } from "../../../../site/scripts/component-data.js";
import {
  ReaderPageDescriptor,
  ReaderReferences,
} from "../../page-descriptor.js";
import { Model as CafeModel } from "../cafe/model.js";
import { Model as DocsModel } from "../docs/model.js";
import { Model as MotionDemoModel } from "../motion/model.js";
import { ReaderBlock } from "../reader-document.js";
import { ReaderBreadcrumb, ReaderNodeSchema } from "../reader-node.js";
import { Model as TubeModel } from "../tube/model.js";

export { ReaderReferences } from "../../page-descriptor.js";

export const CopyPrompt = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  showText: Schema.Boolean,
  text: Schema.String,
});

export const ReaderFlags = Schema.Struct({
  agentMarkdown: Schema.OptionFromOptional(Schema.String),
  bibliography: Schema.Array(bibliographySourceSchema),
  blocks: Schema.Array(ReaderBlock),
  bodyNodes: Schema.OptionFromOptional(Schema.Array(ReaderNodeSchema)),
  breadcrumb: Schema.OptionFromOptional(ReaderBreadcrumb),
  cafe: Schema.OptionFromOptional(CafeModel),
  codeFences: Schema.Array(
    Schema.Struct({ html: Schema.String, value: Schema.String })
  ),
  copyPrompts: Schema.Array(CopyPrompt),
  docs: Schema.OptionFromOptional(DocsModel),
  heading: Schema.String,
  motion: Schema.OptionFromOptional(MotionDemoModel),
  newsTitle: Schema.OptionFromOptional(Schema.String),
  origin: Schema.String,
  page: ReaderPageDescriptor,
  references: Schema.OptionFromOptional(ReaderReferences),
  snippets: Schema.Array(
    Schema.Struct({
      at: Schema.String,
      html: Schema.String,
      lines: Schema.String,
      path: Schema.String,
      repo: Schema.String,
    })
  ),
  terms: Schema.Array(Schema.String),
  tube: Schema.OptionFromOptional(TubeModel),
});

export type ReaderPageFlags = typeof ReaderFlags.Type;

export const pageCopyId = "document";

export const CopyStatus = defineTaggedUnion({
  Copied: {},
  Copying: {},
  Failed: {},
  Idle: {},
});

export const ClipboardAccess = defineTaggedUnion({
  Available: {},
  Unavailable: {},
  Unknown: {},
});

export const DetectedClipboardAccess = ClipboardAccess.subset([
  "Available",
  "Unavailable",
]);

export const DocsSearchState = defineTaggedUnion({
  Failed: { query: Schema.String },
  Idle: {},
  Loaded: { query: Schema.String, result: DocsSearchOutput },
  Loading: { query: Schema.String },
});

export type DocsSearchStateType = typeof DocsSearchState.Type;

export const MobileNav = Schema.Struct({ open: Schema.Boolean });

export const MobileToc = Schema.Struct({ open: Schema.Boolean });

export const Model = Schema.Struct({
  ...ReaderFlags.fields,
  clipboardAccess: ClipboardAccess,
  copyStatuses: Schema.Record(Schema.String, CopyStatus),
  docsSearch: DocsSearchState,
  docsSearchQuery: Schema.String,
  docsSearchSelected: Schema.Finite,
  mobileNav: MobileNav,
  mobileToc: MobileToc,
  readingAnchorId: Schema.OptionFromOptional(Schema.String),
});

export type ReaderModel = typeof Model.Type;

export const initialModel = (flags: ReaderPageFlags): ReaderModel => ({
  ...flags,
  clipboardAccess: ClipboardAccess.Unknown(),
  copyStatuses: {},
  docsSearch: DocsSearchState.Idle(),
  docsSearchQuery: "",
  docsSearchSelected: 0,
  mobileNav: { open: false },
  mobileToc: { open: false },
  readingAnchorId: Option.none(),
});

export const docsSearchMatchesOf = (model: ReaderModel) =>
  DocsSearchState.match(model.docsSearch, {
    Failed: () => [],
    Idle: () => [],
    Loaded: ({ result }) => result.matches,
    Loading: () => [],
  });

export const docsSearchTotalOf = (model: ReaderModel) =>
  DocsSearchState.match(model.docsSearch, {
    Failed: () => 0,
    Idle: () => 0,
    Loaded: ({ result }) => result.total,
    Loading: () => 0,
  });

export const copyStatusOf = (
  model: Pick<ReaderModel, "copyStatuses">,
  id: string
): typeof CopyStatus.Type =>
  Option.getOrElse(Record.get(model.copyStatuses, id), () => CopyStatus.Idle());

export const findCopyPrompt = (
  model: Pick<ReaderModel, "copyPrompts">,
  id: string
) => Array.findFirst(model.copyPrompts, (prompt) => prompt.id === id);

export const currentAnchorText = (
  model: Pick<ReaderModel, "readingAnchorId" | "references">
): string =>
  Option.match(model.readingAnchorId, {
    onNone: () => "",
    onSome: (id) =>
      Option.match(model.references, {
        onNone: () => "",
        onSome: (references) =>
          Option.match(
            Array.findFirst(references.anchors, (anchor) => anchor.id === id),
            { onNone: () => "", onSome: (anchor) => anchor.text }
          ),
      }),
  });
