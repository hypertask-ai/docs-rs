import { AssetReadError } from "@rat-stack/core/contracts";
import { Context, Effect, Layer, Option, Ref, Schema } from "effect";

import { staticAssetGeneration } from "./bundled-content.generated.js";
import { DocsSearchIndex } from "./docs-search-data.js";
import type { DocsSearchIndexData } from "./docs-search-data.js";
import { StaticAssets } from "./static-assets.js";

const indexEnvelope = Schema.Struct({
  data: DocsSearchIndex,
  generation: Schema.String,
});

export const docsSearchIndexPath = "/_content/docs-search.json";

const readIndex = (
  assets: StaticAssets["Service"],
  generation: string
): Effect.Effect<DocsSearchIndexData, AssetReadError> =>
  assets.read(docsSearchIndexPath).pipe(
    Effect.flatMap((bytes) =>
      Schema.decodeEffect(Schema.fromJsonString(indexEnvelope))(
        new TextDecoder().decode(bytes)
      )
    ),
    Effect.mapError((cause) =>
      Schema.is(AssetReadError)(cause)
        ? cause
        : new AssetReadError({
            cause,
            path: docsSearchIndexPath,
            reason: "decode",
          })
    ),
    Effect.flatMap((envelope) =>
      envelope.generation === generation
        ? Effect.succeed(envelope.data)
        : Effect.fail(
            new AssetReadError({
              cause: envelope.generation,
              path: docsSearchIndexPath,
              reason: "generation",
            })
          )
    )
  );

const makeStore = Effect.fn("DocsSearchStore.make")(function* makeStore(
  generation: string
) {
  const assets = yield* StaticAssets;
  const completed = yield* Ref.make<Option.Option<DocsSearchIndexData>>(
    Option.none()
  );

  const readCompleted = Effect.gen(function* readCachedDocsSearch() {
    const cached = yield* Ref.get(completed);

    if (Option.isSome(cached)) {
      return cached.value;
    }

    const value = yield* readIndex(assets, generation);
    yield* Ref.set(completed, Option.some(value));

    return value;
  });

  return { index: readCompleted } satisfies DocsSearchStoreService;
});

export interface DocsSearchStoreService {
  readonly index: Effect.Effect<DocsSearchIndexData, AssetReadError>;
}

export class DocsSearchStore extends Context.Service<
  DocsSearchStore,
  DocsSearchStoreService
>()("mischief/DocsSearchStore") {
  static readonly layerForGeneration = (generation: string) =>
    Layer.effect(DocsSearchStore, makeStore(generation));

  static readonly layer = DocsSearchStore.layerForGeneration(
    staticAssetGeneration
  );
}
