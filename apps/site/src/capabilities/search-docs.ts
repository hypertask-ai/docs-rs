import { implement } from "@hypertask-docs/capability/implement";
import { searchDocsContract } from "@hypertask-docs/core/contracts";

import { ContentStore } from "../content-store.js";

export const searchDocs = implement(searchDocsContract, ({ limit, query }) =>
  ContentStore.use((store) => store.searchDocs(query, limit))
);
