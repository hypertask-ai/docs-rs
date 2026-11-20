import { Effect, Schema } from "effect";
import { Command, Dom } from "foldkit";
import { pushUrl } from "foldkit/navigation";

import { DocumentQueries } from "../docs/queries.js";
import { Message } from "./message.js";
import { ClipboardAccess } from "./model.js";

class ClipboardFailure extends Schema.TaggedError<
  ClipboardFailure,
  { readonly brand: unique symbol }
>()("ClipboardFailure", { cause: Schema.Unknown }) {}

export const MoveFocus = Command.define("MoveFocus", {
  args: { selector: Schema.String },
  execute: ({ selector }) =>
    Dom.focus(selector).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedMoveFocus())
    ),
  messages: [Message.CompletedMoveFocus],
});

export const DetectClipboard = Command.define("DetectClipboard", {
  execute: Effect.sync(() =>
    Message.CompletedDetectClipboard({
      access:
        navigator.clipboard === undefined
          ? ClipboardAccess.Unavailable()
          : ClipboardAccess.Available(),
    })
  ),
  messages: [Message.CompletedDetectClipboard],
});

export const CopyReaderText = Command.define("CopyReaderText", {
  args: { id: Schema.String, text: Schema.String },
  execute: ({ id, text }) =>
    Effect.tryPromise({
      catch: (cause) => new ClipboardFailure({ cause }),
      try: () => navigator.clipboard.writeText(text),
    }).pipe(
      Effect.match({
        onFailure: () => Message.FailedCopyReaderText({ id }),
        onSuccess: () => Message.SucceededCopyReaderText({ id }),
      })
    ),
  messages: [Message.FailedCopyReaderText, Message.SucceededCopyReaderText],
});

export const CopyPageMarkdown = Command.define("CopyPageMarkdown", {
  args: { url: Schema.String },
  execute: ({ url }) =>
    Effect.gen(function* copyPage() {
      const response = yield* Effect.tryPromise({
        catch: (cause) => new ClipboardFailure({ cause }),
        // @effect-diagnostics-next-line globalFetchInEffect:off -- the reader copies its own Markdown in the browser, where the app runtime provides no HttpClient.
        try: () => fetch(url),
      });

      if (!response.ok) {
        return yield* new ClipboardFailure({
          cause: `Copy page markdown returned HTTP ${response.status}`,
        });
      }

      const text = yield* Effect.tryPromise({
        catch: (cause) => new ClipboardFailure({ cause }),
        try: () => response.text(),
      });

      return yield* Effect.tryPromise({
        catch: (cause) => new ClipboardFailure({ cause }),
        try: () => navigator.clipboard.writeText(text),
      });
    }).pipe(
      Effect.match({
        onFailure: () => Message.FailedCopyPage(),
        onSuccess: () => Message.SucceededCopyPage(),
      })
    ),
  messages: [Message.FailedCopyPage, Message.SucceededCopyPage],
});

export const WaitBeforeCopyReset = Command.define("WaitBeforeCopyReset", {
  args: { id: Schema.String },
  execute: ({ id }) =>
    Effect.sleep("2 seconds").pipe(
      Effect.as(Message.CompletedWaitBeforeCopyReset({ id }))
    ),
  messages: [Message.CompletedWaitBeforeCopyReset],
});

export const QueryDocsSearch = Command.define("QueryDocsSearch", {
  args: { query: Schema.String },
  execute: ({ query }) =>
    Effect.sleep("200 millis").pipe(
      Effect.andThen(
        DocumentQueries.use((queries) => queries.docsSearch(query))
      ),
      Effect.map((result) => Message.SucceededDocsSearch({ query, result })),
      Effect.orElseSucceed(() => Message.FailedDocsSearch({ query }))
    ),
  messages: [Message.SucceededDocsSearch, Message.FailedDocsSearch],
});

const docsSearchDialogId = "docs-search";

const docsSearchDialog = () => {
  const element = document.querySelector(`#${docsSearchDialogId}`);

  return element instanceof HTMLDialogElement ? element : undefined;
};

export const OpenDocsSearchDialog = Command.define("OpenDocsSearchDialog", {
  execute: Effect.sync(() => {
    const dialog = docsSearchDialog();

    if (dialog !== undefined && !dialog.open) {
      dialog.showModal();
    }

    return Message.CompletedDocsSearchNavigation();
  }),
  messages: [Message.CompletedDocsSearchNavigation],
});

export const OpenDocsSearchResult = Command.define("OpenDocsSearchResult", {
  args: { url: Schema.String },
  execute: ({ url }) =>
    Effect.sync(() => {
      const dialog = docsSearchDialog();

      if (dialog !== undefined && dialog.open) {
        dialog.close();
      }
    }).pipe(
      Effect.andThen(pushUrl(url)),
      Effect.as(Message.CompletedDocsSearchNavigation())
    ),
  messages: [Message.CompletedDocsSearchNavigation],
});
