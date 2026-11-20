import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Message as CafeMessage } from "../cafe/message.js";
import { Message as DocsMessage } from "../docs/message.js";
import { Message as MotionDemoMessage } from "../motion/message.js";
import { Message as TubeMessage } from "../tube/message.js";
import { DetectedClipboardAccess } from "./model.js";

export const Message = defineMessageUnion({
  ClickedCopy: { id: Schema.String },
  ClickedCopyPage: {},
  ClickedMobileNavToggle: {},
  ClickedMobileTocLink: {},
  ClickedMobileTocToggle: {},
  ClickedOutsideMobileToc: {},
  CompletedDetectClipboard: { access: DetectedClipboardAccess },
  CompletedMoveFocus: {},
  CompletedWaitBeforeCopyReset: { id: Schema.String },
  FailedCopyPage: {},
  FailedCopyReaderText: { id: Schema.String },
  GotCafeMessage: { message: CafeMessage },
  GotDocsMessage: { message: DocsMessage },
  GotMotionMessage: { message: MotionDemoMessage },
  GotTubeMessage: { message: TubeMessage },
  MeasuredReadingAnchor: { id: Schema.OptionFromOptional(Schema.String) },
  PressedEscapeInMobileNav: {},
  PressedEscapeInMobileToc: {},
  SucceededCopyPage: {},
  SucceededCopyReaderText: { id: Schema.String },
});

export type ReaderMessage = typeof Message.Type;
