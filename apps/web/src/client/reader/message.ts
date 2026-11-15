import { DocsSearchOutput } from "@rat-stack/core/contracts";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Message as CafeMessage } from "../cafe/message.js";
import { Message as DocsMessage } from "../docs/message.js";
import { Message as MotionDemoMessage } from "../motion/message.js";
import { Message as TubeMessage } from "../tube/message.js";
import { DetectedClipboardAccess } from "./model.js";

export const Message = defineMessageUnion({
  ClosedDocsSearch: {},
  ClickedCopy: { id: Schema.String },
  ClickedCopyPage: {},
  CompletedDetectClipboard: { access: DetectedClipboardAccess },
  CompletedDocsSearchNavigation: {},
  FailedDocsSearch: { query: Schema.String },
  MovedDocsSearchSelection: { offset: Schema.Finite },
  OpenedDocsSearch: {},
  SelectedDocsSearch: { index: Schema.Finite },
  ShowedMoreDocsSearchResults: {},
  SucceededDocsSearch: { query: Schema.String, result: DocsSearchOutput },
  SubmittedDocsSearch: {},
  ToggledDocsSearch: {},
  UpdatedDocsSearchQuery: { value: Schema.String },
  CompletedWaitBeforeCopyReset: { id: Schema.String },
  FailedCopyPage: {},
  FailedCopyReaderText: { id: Schema.String },
  GotCafeMessage: { message: CafeMessage },
  GotDocsMessage: { message: DocsMessage },
  GotMotionMessage: { message: MotionDemoMessage },
  GotTubeMessage: { message: TubeMessage },
  SucceededCopyPage: {},
  SucceededCopyReaderText: { id: Schema.String },
});

export type ReaderMessage = typeof Message.Type;
