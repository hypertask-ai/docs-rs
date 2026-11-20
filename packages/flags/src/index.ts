export { defineFlag, Flags } from "@hypertask-docs/core/flags";

export type { Flag, FlagContext } from "@hypertask-docs/core/flags";

export {
  flagCapabilities,
  getFlag,
  listFlags,
} from "@hypertask-docs/core/flag-capabilities";

export {
  evaluateFlag,
  FlagRule,
  Percentage,
  subjectBucket,
} from "./evaluate.js";

export type { Rule } from "./evaluate.js";

export { checkFlagExpiry, ExpiredFlags } from "./expiry.js";
