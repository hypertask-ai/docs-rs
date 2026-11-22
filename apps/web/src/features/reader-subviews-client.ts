import { view as docsView } from "./app.js";
import * as CafeView from "./cafe/index.js";
import * as MotionView from "./motion/index.js";
import type { ReaderSubviewViews } from "./reader-subview-types.js";
import { buildReaderView, buildReaderViewAt } from "./reader.js";
import * as TubeView from "./tube/index.js";

export const readerSubviewViews: ReaderSubviewViews = {
  cafe: CafeView.view,
  docs: docsView,
  motion: MotionView.view,
  tube: TubeView.view,
};

export const view = buildReaderView(readerSubviewViews);

export const viewAt = (basePath: string) =>
  buildReaderViewAt(readerSubviewViews, basePath);
