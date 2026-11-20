import { DocsSearchOutput } from "@rat-stack/core/contracts";
import { Option, Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Message as CafeMessage } from "../cafe/message.js";
import { Message as DocsMessage } from "../docs/message.js";
import { Message as MotionDemoMessage } from "../motion/message.js";
import { Message as TubeMessage } from "../tube/message.js";
import { DetectedClipboardAccess } from "./model.js";

export const Message = defineMessageUnion({
  ClickedCopy: { id: Schema.String },
  ClickedCopyPage: {},
  CompletedDetectClipboard: { access: DetectedClipboardAccess },
  CompletedDocsSearchNavigation: {},
  CompletedWaitBeforeCopyReset: { id: Schema.String },
  FailedCopyPage: {},
  FailedCopyReaderText: { id: Schema.String },
  FailedDocsSearch: { query: Schema.String },
  GotCafeMessage: { message: CafeMessage },
  GotDocsMessage: { message: DocsMessage },
  GotMotionMessage: { message: MotionDemoMessage },
  GotTubeMessage: { message: TubeMessage },
  MovedDocsSearchSelection: { offset: Schema.Finite },
  PressedDocsSearchShortcut: {},
  SelectedDocsSearch: { index: Schema.Finite },
  SubmittedDocsSearch: {},
  SucceededCopyPage: {},
  SucceededCopyReaderText: { id: Schema.String },
  SucceededDocsSearch: { query: Schema.String, result: DocsSearchOutput },
  UpdatedDocsSearchQuery: { value: Schema.String },
});

export type ReaderMessage = typeof Message.Type;

export const docsSearchKeyMessage = (
  key: string
): Option.Option<ReaderMessage> => {
  if (key === "ArrowDown") {
    return Option.some(Message.MovedDocsSearchSelection({ offset: 1 }));
  }

  if (key === "ArrowUp") {
    return Option.some(Message.MovedDocsSearchSelection({ offset: -1 }));
  }

  if (key === "Enter") {
    return Option.some(Message.SubmittedDocsSearch());
  }

  return Option.none();
};
