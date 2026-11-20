import type * as Cafe from "./cafe/index.js";
import type * as DocsApp from "./app.js";
import type * as Motion from "./motion/index.js";
import type * as Tube from "./tube/index.js";

export interface ReaderSubviewViews {
  readonly cafe: typeof Cafe.view;
  readonly docs: typeof DocsApp.view;
  readonly motion: typeof Motion.view;
  readonly tube: typeof Tube.view;
}

export type ReaderSubviewKey = keyof ReaderSubviewViews;

export type ReaderSubviewResolver = <K extends ReaderSubviewKey>(
  key: K
) => ReaderSubviewViews[K];