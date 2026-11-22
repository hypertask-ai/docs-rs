import { implement } from "@hypertask-docs/capability/implement";
import {
  changelogJsonFeedContract,
  changelogJsonText,
  changelogMarkdownFeedContract,
  changelogMarkdownText,
  changelogRssFeedContract,
  changelogRssText,
} from "@hypertask-docs/core/changelog";
import type { ChangelogEntryValue } from "@hypertask-docs/core/changelog";
import { Effect } from "effect";

import { ContentStore } from "../content-store.js";

const feed = <A>(render: (entries: readonly ChangelogEntryValue[]) => A) =>
  Effect.gen(function* renderChangelogFeed() {
    const store = yield* ContentStore;

    return render(yield* store.changelog);
  });

export const changelogJsonFeed = implement(changelogJsonFeedContract, () =>
  feed(changelogJsonText)
);

export const changelogMarkdownFeed = implement(
  changelogMarkdownFeedContract,
  () => feed(changelogMarkdownText)
);

export const changelogRssFeed = implement(changelogRssFeedContract, () =>
  feed(changelogRssText)
);

export const changelogCapabilities = [
  changelogJsonFeed,
  changelogMarkdownFeed,
  changelogRssFeed,
] as const;
