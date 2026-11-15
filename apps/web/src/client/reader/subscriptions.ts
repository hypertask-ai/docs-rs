import { Dom, Subscription } from "foldkit";

import * as MotionDemo from "../motion/index.js";
import { Message } from "./message.js";
import type { ReaderMessage } from "./message.js";
import type { ReaderModel } from "./model.js";

const docsSearchShortcut = Subscription.make<ReaderModel, ReaderMessage>()(
  () => ({
    docsSearchShortcut: Subscription.persistentEntry(
      Dom.streamFromKeyBindings<ReaderMessage>({
        bindings: [
          {
            keys: "Mod+K",
            mapEvent: () => Message.PressedDocsSearchShortcut(),
            whileTyping: "Allow",
          },
        ],
      })
    ),
  })
);

const motion = Subscription.lift(MotionDemo.subscriptions)<
  ReaderModel,
  ReaderMessage
>({
  read: (model) => model.motion,
  toParentMessage: (message) => Message.GotMotionMessage({ message }),
});

export const subscriptions = Subscription.aggregate<
  ReaderModel,
  ReaderMessage
>()(motion, docsSearchShortcut);
