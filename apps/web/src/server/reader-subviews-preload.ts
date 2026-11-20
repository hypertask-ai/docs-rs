import { Option } from "effect";
import { Effect } from "effect";

import type { ReaderPageFlags } from "../client/reader/model.js";
import { setReaderSubviewViews } from "../features/reader-subviews.js";

export const preloadReaderSubviewViews = (flags: ReaderPageFlags) =>
  Effect.gen(function* preload() {
    const pending: Array<Promise<void>> = [];

    if (Option.isSome(flags.cafe)) {
      pending.push(
        import("../features/cafe/index.js").then((module) => {
          setReaderSubviewViews({ cafe: module.view });
        })
      );
    }

    if (Option.isSome(flags.docs)) {
      pending.push(
        import("../features/app.js").then((module) => {
          setReaderSubviewViews({ docs: module.view });
        })
      );
    }

    if (Option.isSome(flags.motion)) {
      pending.push(
        import("../features/motion/index.js").then((module) => {
          setReaderSubviewViews({ motion: module.view });
        })
      );
    }

    if (Option.isSome(flags.tube)) {
      pending.push(
        import("../features/tube/index.js").then((module) => {
          setReaderSubviewViews({ tube: module.view });
        })
      );
    }

    if (pending.length > 0) {
      yield* Effect.promise(() => Promise.all(pending));
    }
  });