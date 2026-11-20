import type { ApplicationInit } from "foldkit/runtime";

import type { ReaderMessage } from "./message.js";
import { initialModel } from "./model.js";
import type { ReaderModel, ReaderPageFlags } from "./model.js";

export const init: ApplicationInit<
  ReaderModel,
  ReaderMessage,
  ReaderPageFlags
> = (flags) => ({ model: initialModel(flags) });
