import { toRpcGroup } from "@hypertask-docs/capability/rpc-group";
import {
  readContract,
  searchContract,
  searchDocsContract,
} from "@hypertask-docs/core/contracts";
import { Cache, Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { RpcClient, RpcSerialization } from "effect/rpc";

import { withSiteBasePath } from "../../site-base.js";

const { group } = toRpcGroup([
  searchContract,
  searchDocsContract,
  readContract,
]);

const protocol = RpcClient.layerProtocolHttp({
  url: withSiteBasePath("/rpc"),
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerJson]));

const make = Effect.gen(function* makeDocumentQueries() {
  const client = yield* RpcClient.make(group).pipe(Effect.provide(protocol));

  const search = yield* Cache.make({
    capacity: Number.POSITIVE_INFINITY,
    lookup: (query: string) => client.search({ limit: 10, query }),
    timeToLive: "30 seconds",
  });

  const docs = yield* Cache.make({
    capacity: Number.POSITIVE_INFINITY,
    lookup: (query: string) => client.searchDocs({ limit: 20, query }),
    timeToLive: "30 seconds",
  });

  const read = yield* Cache.make({
    capacity: Number.POSITIVE_INFINITY,
    lookup: (id: string) => client.read({ id }),
  });

  return {
    docsSearch: (query: string) => Cache.get(docs, query),
    read: (id: string) => Cache.get(read, id),
    search: (query: string) => Cache.get(search, query),
  };
});

export class DocumentQueries extends Context.Service<
  DocumentQueries,
  Effect.Success<typeof make>
>()("@hypertask-docs/web/DocumentQueries", { make }) {
  static readonly layer = Layer.effect(this, this.make);
}
