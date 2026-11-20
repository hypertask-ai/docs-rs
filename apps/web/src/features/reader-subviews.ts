import type { HtmlBuilder } from "foldkit/html";

import type { ReaderMessage } from "../client/reader/message.js";

type SubviewView = (
  model: never,
  h: HtmlBuilder<ReaderMessage>
) => unknown;

type Installed = {
  readonly cafe?: SubviewView;
  readonly docs?: SubviewView;
  readonly motion?: SubviewView;
  readonly tube?: SubviewView;
};

let installed: Installed = {};

export const setReaderSubviewViews = (views: Installed) => {
  installed = { ...installed, ...views };
};

export const readerSubviewView = <K extends keyof Installed>(
  key: K
): NonNullable<Installed[K]> => {
  const view = installed[key];

  if (view === undefined) {
    throw new Error(`Reader subview ${String(key)} is not installed`);
  }

  return view;
};