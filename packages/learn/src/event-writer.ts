import type {
  LearnEvent,
  LearnerProgressError,
} from "@hypertask-docs/core/learn";
import { Context } from "effect";
import type { Effect } from "effect";

export class LearnEventWriter extends Context.Service<
  LearnEventWriter,
  {
    readonly append: (
      event: LearnEvent
    ) => Effect.Effect<void, LearnerProgressError>;
  }
>()("@hypertask-docs/learn/LearnEventWriter") {}
