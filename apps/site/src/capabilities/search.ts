import { implement } from "@hypertask-docs/capability/implement";
import { searchContract } from "@hypertask-docs/core/contracts";
import { Effect } from "effect";

import { ContentStore } from "../content-store.js";

export const search = implement(searchContract, ({ limit, query }) =>
  ContentStore.use((store) => store.search(query, limit)).pipe(
    Effect.map((matches) => ({ matches, total: matches.length }))
  )
);
