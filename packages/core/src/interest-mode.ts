import { Context, Layer } from "effect";

export type InterestModeName = "capture" | "doi" | "drovr";

export class InterestMode extends Context.Service<
  InterestMode,
  InterestModeName
>()("@hypertask-docs/core/InterestMode") {
  static readonly layer = (mode: InterestModeName) => Layer.succeed(this, mode);
}
