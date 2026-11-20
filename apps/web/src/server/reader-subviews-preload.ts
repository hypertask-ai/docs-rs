import { Effect, Option } from "effect";

import type { ReaderPageFlags } from "../client/reader/model.js";
import type { ReaderSubviewViews } from "../features/reader-subview-types.js";

type MutableSubviewViews = {
  [K in keyof ReaderSubviewViews]?: ReaderSubviewViews[K];
};

export const loadReaderSubviewViews = (flags: ReaderPageFlags) =>
  Effect.gen(function* load() {
    const subviews: MutableSubviewViews = {};

    if (Option.isSome(flags.cafe)) {
      const cafe = yield* Effect.promise(
        () => import("../features/cafe/index.js")
      );

      subviews.cafe = cafe.view;
    }

    if (Option.isSome(flags.docs)) {
      const docs = yield* Effect.promise(() => import("../features/app.js"));

      subviews.docs = docs.view;
    }

    if (Option.isSome(flags.motion)) {
      const motion = yield* Effect.promise(
        () => import("../features/motion/index.js")
      );

      subviews.motion = motion.view;
    }

    if (Option.isSome(flags.tube)) {
      const tube = yield* Effect.promise(
        () => import("../features/tube/index.js")
      );

      subviews.tube = tube.view;
    }

    return subviews;
  });
