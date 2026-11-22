import { Effect } from "effect";
import { renderToString } from "foldkit/experimental/server";

import { init } from "../client/reader/init.js";
import { ReaderFlags } from "../client/reader/model.js";
import type { ReaderPageFlags } from "../client/reader/model.js";
import { buildReaderView } from "../features/reader.js";
import { loadReaderSubviewViews } from "./reader-subviews-preload.js";

export const renderReaderToString = (flags: ReaderPageFlags) =>
  Effect.gen(function* renderReader() {
    const subviews = yield* loadReaderSubviewViews(flags);

    return yield* renderToString(
      { Flags: ReaderFlags, init, view: buildReaderView(subviews) },
      { flags }
    );
  });
