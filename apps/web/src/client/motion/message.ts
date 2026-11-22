import * as Motion from "@hypertask-docs/motion/foldkit";
import { defineMessageUnion } from "foldkit/message";

import { TargetId } from "./model.js";

export const Message = defineMessageUnion({
  ClickedReplayCurves: {},
  ClickedTarget: { target: TargetId },
  GotMotionMessage: { message: Motion.Message },
});

export type MotionDemoMessage = typeof Message.Type;
