import * as Cloudflare from "@alchemy.run/cloudflare";

export const docsRatstackStateStoreName = "alchemy-state-store-docs-ratstack";

export const docsRatstackState = (state = Cloudflare.state) =>
  state({ workerName: docsRatstackStateStoreName });
