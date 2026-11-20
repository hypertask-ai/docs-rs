import { view as docsView } from "./app.js";
import * as CafeView from "./cafe/index.js";
import * as MotionView from "./motion/index.js";
import { makeView, makeViewAt } from "./reader.js";
import type { ReaderSubviewViews } from "./reader-subview-types.js";
import * as TubeView from "./tube/index.js";

export const readerSubviewViews: ReaderSubviewViews = {
  cafe: CafeView.view,
  docs: docsView,
  motion: MotionView.view,
  tube: TubeView.view,
};

export const view = makeView(readerSubviewViews);

export const viewAt = (basePath: string) => makeViewAt(readerSubviewViews, basePath);