import { Effect, Option } from "effect";

import type { ReaderPageFlags } from "../client/reader/model.js";
import type { ReaderSubviewViews } from "../features/reader-subview-types.js";

export const loadReaderSubviewViews = (flags: ReaderPageFlags) =>
  Effect.promise(async () => {
    const subviews: Partial<ReaderSubviewViews> = {};

    if (Option.isSome(flags.cafe)) {
      const cafe = await import("../features/cafe/index.js");

      subviews.cafe = cafe.view;
    }

    if (Option.isSome(flags.docs)) {
      const docs = await import("../features/app.js");

      subviews.docs = docs.view;
    }

    if (Option.isSome(flags.motion)) {
      const motion = await import("../features/motion/index.js");

      subviews.motion = motion.view;
    }

    if (Option.isSome(flags.tube)) {
      const tube = await import("../features/tube/index.js");

      subviews.tube = tube.view;
    }

    return subviews;
  });
