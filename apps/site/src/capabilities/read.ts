import { implement } from "@hypertask-docs/capability/implement";
import { readContract } from "@hypertask-docs/core/contracts";

import { ContentStore } from "../content-store.js";

export const read = implement(readContract, ({ id }) =>
  ContentStore.use((store) => store.read(id))
);
