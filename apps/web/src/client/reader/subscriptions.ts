import { Option, Stream } from "effect";
import { Dom, Subscription } from "foldkit";

import { currentHeadingId } from "../../features/docs-reading-position.js";
import type { DocsHeadingPosition } from "../../features/docs-reading-position.js";
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

const readingThreshold = () =>
  (document.querySelector(".docs-header")?.getBoundingClientRect().height ??
    0) +
  (document.querySelector("#docs-mobile-toc-summary")?.getBoundingClientRect()
    .height ?? 0) +
  32;

const headingPositions = (): readonly DocsHeadingPosition[] =>
  [
    ...document.querySelectorAll<HTMLAnchorElement>(".docs-mobile-toc-list a"),
  ].flatMap((link) => {
    const id = decodeURIComponent(link.hash.slice(1));
    const heading = document.querySelector(`[id="${CSS.escape(id)}"]`);

    return heading === null
      ? []
      : [{ id, top: heading.getBoundingClientRect().top }];
  });

const sameAnchor = (
  previous: Option.Option<string>,
  next: Option.Option<string>
): boolean =>
  Option.match(previous, {
    onNone: () => Option.isNone(next),
    onSome: (current) =>
      Option.match(next, {
        onNone: () => false,
        onSome: (value) => value === current,
      }),
  });

const readingPosition = () => {
  let previous = Option.none<string>();

  return Dom.streamFromEvent({
    mapEvent: () =>
      Message.MeasuredReadingAnchor({
        id: currentHeadingId(headingPositions(), readingThreshold()),
      }),
    options: { passive: true },
    target: () => document,
    type: "scroll",
  }).pipe(
    Stream.filter((message) => {
      const changed = !sameAnchor(previous, message.id);
      previous = message.id;

      return changed;
    })
  );
};

const outsideTocClick = () =>
  Dom.streamFromEventFilterMap({
    filterMapEvent: (event) =>
      event.target instanceof Element &&
      event.target.closest("#docs-mobile-toc") === null
        ? Option.some(Message.ClickedOutsideMobileToc())
        : Option.none(),
    target: () => document,
    type: "click",
  });

export const subscriptions = Subscription.aggregate<
  ReaderModel,
  ReaderMessage
>()(
  motion,
  docsSearchShortcut,
  Subscription.make<ReaderModel, ReaderMessage>()(() => ({
    outsideTocClick: Subscription.persistentEntry(outsideTocClick()),
    readingPosition: Subscription.persistentEntry(readingPosition()),
  }))
);
