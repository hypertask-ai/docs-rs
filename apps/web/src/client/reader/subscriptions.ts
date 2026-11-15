import { Schema, Stream } from "effect";
import { Dom, Subscription } from "foldkit";

import * as MotionDemo from "../motion/index.js";
import { Message } from "./message.js";
import type { ReaderMessage } from "./message.js";
import type { ReaderModel } from "./model.js";

const docsSearchShortcut = Subscription.make<ReaderModel, ReaderMessage>()(
  (entry) => ({
    keys: entry(
      { searching: Schema.Boolean },
      {
        dependenciesToStream: ({ searching }) =>
          searching
            ? Dom.streamFromKeyBindings<ReaderMessage>({
                bindings: [
                  {
                    keys: "Mod+K",
                    mapEvent: () => Message.PressedDocsSearchShortcut(),
                    whileTyping: "Allow",
                  },
                ],
              })
            : Stream.empty,
        modelToDependencies: (model) => ({
          searching: model.docs !== undefined,
        }),
      }
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
