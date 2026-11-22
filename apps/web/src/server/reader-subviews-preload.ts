import { Effect, Option } from "effect";

import type { ReaderPageFlags } from "../client/reader/model.js";
import type { ReaderSubviewViews } from "../features/reader-subview-types.js";

export const loadReaderSubviewViews = (flags: ReaderPageFlags) =>
  Effect.gen(function* load() {
    const cafe = Option.isSome(flags.cafe)
      ? {
          cafe: (yield* Effect.promise(
            () => import("../features/cafe/index.js")
          )).view,
        }
      : {};

    const docs = Option.isSome(flags.docs)
      ? {
          docs: (yield* Effect.promise(() => import("../features/app.js")))
            .view,
        }
      : {};

    const motion = Option.isSome(flags.motion)
      ? {
          motion: (yield* Effect.promise(
            () => import("../features/motion/index.js")
          )).view,
        }
      : {};

    const tube = Option.isSome(flags.tube)
      ? {
          tube: (yield* Effect.promise(
            () => import("../features/tube/index.js")
          )).view,
        }
      : {};

    return {
      ...cafe,
      ...docs,
      ...motion,
      ...tube,
    } satisfies Partial<ReaderSubviewViews>;
  });
