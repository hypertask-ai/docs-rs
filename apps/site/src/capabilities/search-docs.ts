import { implement } from "@rat-stack/capability/implement";
import { searchDocsContract } from "@rat-stack/core/contracts";

import { ContentStore } from "../content-store.js";

export const searchDocs = implement(searchDocsContract, ({ limit, query }) =>
  ContentStore.use((store) => store.searchDocs(query, limit))
);
