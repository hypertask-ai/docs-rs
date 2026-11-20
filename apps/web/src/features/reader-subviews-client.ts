import { view as docsView } from "./app.js";
import * as CafeView from "./cafe/index.js";
import * as MotionView from "./motion/index.js";
import { setReaderSubviewViews } from "./reader-subviews.js";
import * as TubeView from "./tube/index.js";

export const installReaderSubviewViews = () =>
  setReaderSubviewViews({
    cafe: CafeView.view,
    docs: docsView,
    motion: MotionView.view,
    tube: TubeView.view,
  });