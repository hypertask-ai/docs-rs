import { implement } from "@rat-stack/capability/implement";
import { searchDocsContract } from "@rat-stack/core/contracts";
import { Effect } from "effect";

import { DocsSearchStore } from "../docs-search-store.js";
import { searchDocsIndex } from "../docs-search.js";

export const searchDocs = implement(searchDocsContract, ({ limit, query }) =>
  DocsSearchStore.use((store) =>
    store.index.pipe(
      Effect.map((index) => searchDocsIndex(index, query, limit))
    )
  )
);
