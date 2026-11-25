import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { renderToString } from "foldkit/experimental/server";

import { readerBodyFlags } from "../../site/scripts/reader-body-flags.ts";
import { readerCafeFlags } from "../../site/scripts/reader-cafe-flags.ts";
import { prepareReaderSiteInputs } from "../../site/scripts/reader-site-inputs.ts";
import { init } from "../src/client/reader/init.js";
import { ReaderFlags } from "../src/client/reader/model.js";
import { view } from "../src/features/reader-subviews-client.js";

const htmlText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

it.effect(
  "the all stars index renders every seed person as a card and the build has no profile page",
  () =>
    Effect.gen(function* renderAllStars() {
      const inputs = yield* prepareReaderSiteInputs;
      const flags = yield* readerBodyFlags("https://ratstack.sh");

      expect(inputs.cafe.people.map((person) => person.id)).toEqual(
        expect.arrayContaining([
          "devinjameson",
          "effect-ts",
          "jem-computer",
          "sam-goodwin",
        ])
      );

      for (const person of inputs.cafe.people) {
        expect(
          flags.find(
            (candidate) => candidate.page.path === `/all-stars/${person.id}`
          ),
          person.id
        ).toBeUndefined();
      }

      const index = (yield* readerCafeFlags("https://ratstack.sh")).find(
        (candidate) => candidate.page.path === "/all-stars"
      );

      expect(index?.heading).toBe("CAFE all stars");

      if (index === undefined) {
        return;
      }

      const cards = yield* renderToString(
        { Flags: ReaderFlags, init, view },
        {
          flags: yield* Schema.decodeUnknownEffect(ReaderFlags)(index),
          isHydratable: false,
        }
      );

      for (const person of inputs.cafe.people) {
        expect(cards.html).toContain(`src="${person.avatar.path}"`);
        expect(cards.html).toContain(htmlText(person.bio[0].text));
        expect(cards.html).not.toContain(`href="/all-stars/${person.id}"`);
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  { timeout: 30_000 }
);
