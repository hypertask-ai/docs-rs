import { Effect, Option } from "effect";

import type { ReaderPageFlags } from "../client/reader/model.js";
import type { ReaderSubviewViews } from "../features/reader-subview-types.js";

export const loadReaderSubviewViews = (flags: ReaderPageFlags) =>
  Effect.promise(async () => {
    const subviews: Partial<ReaderSubviewViews> = {};

    if (Option.isSome(flags.cafe)) {
      subviews.cafe = (await import("../features/cafe/index.js")).view;
    }

    if (Option.isSome(flags.docs)) {
      subviews.docs = (await import("../features/app.js")).view;
    }

    if (Option.isSome(flags.motion)) {
      subviews.motion = (await import("../features/motion/index.js")).view;
    }

    if (Option.isSome(flags.tube)) {
      subviews.tube = (await import("../features/tube/index.js")).view;
    }

    return subviews;
  });