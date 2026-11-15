import { Option, Record } from "effect";
import { Update } from "foldkit";
import { modifyFields } from "foldkit/struct";

import { update as updateDocs } from "../../features/app.js";
import { docsPageMarkdownPath } from "../../features/docs-sidebar.js";
import * as Cafe from "../cafe/index.js";
import type { AppMessage as DocsMessage } from "../docs/message.js";
import type { AppModel as DocsModel } from "../docs/model.js";
import type { DocumentQueries } from "../docs/queries.js";
import * as MotionDemo from "../motion/index.js";
import * as Tube from "../tube/index.js";
import {
  CopyPageMarkdown,
  CopyReaderText,
  OpenDocsSearchDialog,
  OpenDocsSearchResult,
  QueryDocsSearch,
  WaitBeforeCopyReset,
} from "./command.js";
import { Message } from "./message.js";
import type { ReaderMessage } from "./message.js";
import {
  ClipboardAccess,
  copyStatusOf,
  CopyStatus,
  DocsSearchState,
  docsSearchMatchesOf,
  findCopyPrompt,
  pageCopyId,
} from "./model.js";
import type { ReaderModel } from "./model.js";

const withCopyStatus = (
  model: ReaderModel,
  id: string,
  status: typeof CopyStatus.Type
) => modifyFields(model, { copyStatuses: Record.set(id, status) });

const isCopyInFlight = CopyStatus.isAnyOf(["Copying", "Copied"]);

const copyablePrompt = (model: ReaderModel, id: string) =>
  ClipboardAccess.guards.Available(model.clipboardAccess) &&
  !isCopyInFlight(copyStatusOf(model, id))
    ? findCopyPrompt(model, id)
    : Option.none();

const foldCafe = Update.foldChild({
  read: (model: ReaderModel) => model.cafe,
  toParentMessage: (message: Cafe.CafeMessage) =>
    Message.GotCafeMessage({ message }),
  update: Cafe.update,
  write: (model: ReaderModel, cafe: Cafe.CafeModel) =>
    modifyFields(model, { cafe: () => Option.some(cafe) }),
});

const foldDocs = Update.foldChild({
  read: (model: ReaderModel) => model.docs,
  toParentMessage: (message: DocsMessage) =>
    Message.GotDocsMessage({ message }),
  update: updateDocs,
  write: (model: ReaderModel, docs: DocsModel) =>
    modifyFields(model, { docs: () => Option.some(docs) }),
});

const foldMotion = Update.foldChild({
  read: (model: ReaderModel) => model.motion,
  toParentMessage: (message: MotionDemo.MotionDemoMessage) =>
    Message.GotMotionMessage({ message }),
  update: MotionDemo.update,
  write: (model: ReaderModel, motion: MotionDemo.MotionDemoModel) =>
    modifyFields(model, { motion: () => Option.some(motion) }),
});

const foldTube = Update.foldChild({
  read: (model: ReaderModel) => model.tube,
  toParentMessage: (message: Tube.TubeMessage) =>
    Message.GotTubeMessage({ message }),
  update: Tube.update,
  write: (model: ReaderModel, tube: Tube.TubeModel) =>
    modifyFields(model, { tube: () => Option.some(tube) }),
});

const selectedResult = (model: ReaderModel) => {
  const matches = docsSearchMatchesOf(model);

  const selected = Math.max(
    0,
    Math.min(matches.length - 1, model.docsSearchSelected)
  );

  return matches[selected];
};

export const update = (
  model: ReaderModel,
  message: ReaderMessage
): Update.Return<ReaderModel, ReaderMessage, DocumentQueries> =>
  Message.match<Update.Return<ReaderModel, ReaderMessage, DocumentQueries>>(
    message,
    {
      ClickedCopy: ({ id }) =>
        Option.match(copyablePrompt(model, id), {
          onNone: () => ({ model }),
          onSome: ({ text }) => ({
            commands: [CopyReaderText({ id, text })],
            model: withCopyStatus(model, id, CopyStatus.Copying()),
          }),
        }),
      ClickedCopyPage: () =>
        ClipboardAccess.guards.Available(model.clipboardAccess) &&
        !isCopyInFlight(copyStatusOf(model, pageCopyId))
          ? {
              commands: [
                CopyPageMarkdown({
                  url: `${model.origin}${docsPageMarkdownPath(model.page.path)}`,
                }),
              ],
              model: withCopyStatus(model, pageCopyId, CopyStatus.Copying()),
            }
          : { model },
      CompletedDetectClipboard: ({ access }) => ({
        model: modifyFields(model, { clipboardAccess: () => access }),
      }),
      CompletedDocsSearchNavigation: () => ({ model }),
      CompletedWaitBeforeCopyReset: ({ id }) => ({
        model: CopyStatus.guards.Copied(copyStatusOf(model, id))
          ? withCopyStatus(model, id, CopyStatus.Idle())
          : model,
      }),
      FailedCopyPage: () => ({
        model: withCopyStatus(model, pageCopyId, CopyStatus.Failed()),
      }),
      FailedCopyReaderText: ({ id }) => ({
        model: CopyStatus.guards.Copying(copyStatusOf(model, id))
          ? withCopyStatus(model, id, CopyStatus.Failed())
          : model,
      }),
      FailedDocsSearch: ({ query }) => ({
        model:
          query === model.docsSearchQuery.trim()
            ? modifyFields(model, {
                docsSearch: () => DocsSearchState.Failed({ query }),
              })
            : model,
      }),
      GotCafeMessage: ({ message: cafeMessage }) =>
        foldCafe(model, cafeMessage),
      GotDocsMessage: ({ message: docsMessage }) =>
        foldDocs(model, docsMessage),
      GotMotionMessage: ({ message: motionMessage }) =>
        foldMotion(model, motionMessage),
      GotTubeMessage: ({ message: tubeMessage }) =>
        foldTube(model, tubeMessage),
      MovedDocsSearchSelection: ({ offset }) => {
        const total = docsSearchMatchesOf(model).length;

        return total === 0
          ? { model }
          : {
              model: modifyFields(model, {
                docsSearchSelected: (selected) =>
                  Math.max(0, Math.min(total - 1, selected + offset)),
              }),
            };
      },
      PressedDocsSearchShortcut: () => ({
        commands: [OpenDocsSearchDialog()],
        model: modifyFields(model, { docsSearchSelected: () => 0 }),
      }),
      SelectedDocsSearch: ({ index }) => ({
        model: modifyFields(model, { docsSearchSelected: () => index }),
      }),
      ShowedMoreDocsSearchResults: () => ({
        model: modifyFields(model, {
          docsSearchShown: (shown) => shown + 5,
        }),
      }),
      SubmittedDocsSearch: () => {
        const match = selectedResult(model);

        return match === undefined
          ? { model }
          : {
              commands: [OpenDocsSearchResult({ url: match.routePath })],
              model,
            };
      },
      SucceededCopyPage: () => ({
        commands: [WaitBeforeCopyReset({ id: pageCopyId })],
        model: withCopyStatus(model, pageCopyId, CopyStatus.Copied()),
      }),
      SucceededCopyReaderText: ({ id }) =>
        CopyStatus.guards.Copying(copyStatusOf(model, id))
          ? {
              commands: [WaitBeforeCopyReset({ id })],
              model: withCopyStatus(model, id, CopyStatus.Copied()),
            }
          : { model },
      SucceededDocsSearch: ({ query, result }) => ({
        model:
          query === model.docsSearchQuery.trim()
            ? modifyFields(model, {
                docsSearch: () => DocsSearchState.Loaded({ query, result }),
                docsSearchSelected: (selected) =>
                  Math.max(0, Math.min(result.matches.length - 1, selected)),
              })
            : model,
      }),
      UpdatedDocsSearchQuery: ({ value }) => {
        const query = value.trim();

        return {
          commands: query === "" ? [] : [QueryDocsSearch({ query })],
          model: modifyFields(model, {
            docsSearch: () =>
              query === ""
                ? DocsSearchState.Idle()
                : DocsSearchState.Loading({ query }),
            docsSearchQuery: () => value,
            docsSearchSelected: () => 0,
            docsSearchShown: () => 5,
          }),
        };
      },
    }
  );
