import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Schema } from "effect";
import { readerPrototypeFlags } from "../../site/scripts/reader-prototype-flags.ts";
import { ReaderFlags } from "../src/client/reader/model.ts";
import { serviceCaptureDocument } from "../src/client/service-capture-document.ts";
import { renderReaderToString } from "../src/server/render-reader.ts";

const program = Effect.gen(function* renderLorePrototype() {
  const fs = yield* FileSystem.FileSystem;
  const input = yield* readerPrototypeFlags("https://reader-prototype.invalid");

  const flags = yield* Schema.decodeUnknownEffect(ReaderFlags)({
    ...input,
    blocks: serviceCaptureDocument,
  });

  const rendered = yield* renderReaderToString(flags);

  yield* fs.writeFileString(
    "/tmp/foldkit-site-a-lore-prototype.html",
    rendered.html
  );
  yield* Console.log(
    `Foldkit lore prototype: ${rendered.html.length} bytes; ${flags.snippets.length} real built excerpts; generation ${flags.page.generation}`
  );

  return rendered;
}).pipe(Effect.provide(NodeServices.layer));

NodeRuntime.runMain(program);
