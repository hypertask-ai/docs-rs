import { it } from "@effect/vitest";
import { expect, given, role, scene, title } from "foldkit/scene";

import { update } from "../src/client/reader/update.js";
import { view } from "../src/features/reader.js";
import { readerModelFixture } from "./reader-fixture.js";

it("opens the docs search dialog on a page without the docs browser", () => {
  scene(
    { update, view },
    given(readerModelFixture),
    expect(role("button", { name: "Search docs" })).toHaveAttr(
      "aria-keyshortcuts",
      "Control+K"
    ),
    expect(role("button", { name: "Search docs" })).toHaveAttr(
      "commandfor",
      "docs-search"
    ),
    expect(role("dialog", { name: "Search docs" })).toExist(),
    expect(title("Search docs")).toHaveAttr("placeholder", "Search docs"),
    expect(role("textbox", { name: "Search docs" })).toHaveAttr("type", "text"),
    expect(role("button", { name: "Clear" })).toBeAbsent(),
    expect(role("button", { name: "Cancel" })).toExist()
  );
});
