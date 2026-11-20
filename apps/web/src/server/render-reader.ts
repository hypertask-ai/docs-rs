import { Effect } from "effect";
import { renderToString } from "foldkit/experimental/server";

import { init } from "../client/reader/init.js";
import { ReaderFlags } from "../client/reader/model.js";
import type { ReaderPageFlags } from "../client/reader/model.js";
import { view } from "../features/reader.js";
import { preloadReaderSubviewViews } from "./reader-subviews-preload.js";

export const renderReaderToString = (flags: ReaderPageFlags) =>
  Effect.gen(function* renderReader() {
    yield* preloadReaderSubviewViews(flags);

    return yield* renderToString({ Flags: ReaderFlags, init, view }, { flags });
  });