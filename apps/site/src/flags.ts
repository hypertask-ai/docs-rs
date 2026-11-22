import { eventFlags, eventsEnabled } from "@hypertask-docs/core/flags";
import { cloudflareFlagsLayer } from "@hypertask-docs/flags/cloudflare";
import { configFlagsLayer } from "@hypertask-docs/flags/config";
import { Layer } from "effect";

export const flagsLayer = configFlagsLayer(eventFlags);

export const liveFlagsLayer = cloudflareFlagsLayer(eventFlags, flagsLayer, [
  eventsEnabled.name,
]).pipe(Layer.orDie);
