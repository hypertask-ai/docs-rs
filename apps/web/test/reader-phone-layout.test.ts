import { expect as assert, it } from "@effect/vitest";
import { Option } from "effect";
import {
  Command,
  Subscription,
  click,
  expect,
  given,
  inside,
  keydown,
  role,
  scene,
  selector,
  within,
} from "foldkit/scene";

import { MoveFocus } from "../src/client/reader/command.js";
import { Message } from "../src/client/reader/message.js";
import { initialModel } from "../src/client/reader/model.js";
import { update } from "../src/client/reader/update.js";
import { currentHeadingId } from "../src/features/docs-reading-position.js";
import { view } from "../src/features/reader.js";
import { readerFlagsFixture } from "./reader-fixture.js";

const docsPage = initialModel({
  ...readerFlagsFixture,
  bodyNodes: Option.none(),
  copyPrompts: [],
  heading: "What is Hypertask?",
  page: {
    ...readerFlagsFixture.page,
    metadata: {
      ...readerFlagsFixture.page.metadata,
      canonicalPath: "/getting-started/introduction",
      title: "What is Hypertask?",
    },
    path: "/getting-started/introduction",
  },
  references: Option.some({
    anchors: [
      { id: "choose-your-interface", text: "Choose your interface" },
      { id: "install-the-cli", text: "Install the CLI" },
    ],
    backlinks: [],
    inboundCounts: {},
  }),
});

const layout = selector(".docs-layout");

const drawer = selector("#docs-sidebar");

const menuButton = role("button", { name: "Menu" });

const mobileToc = selector("#docs-mobile-toc");

const mobileTocToggle = selector("#docs-mobile-toc-summary");

const mobileTocCurrent = selector(".docs-mobile-toc-current");

it("the phone menu button names the drawer it controls and toggles it open and shut", () => {
  scene(
    { update, view },
    given(docsPage),
    expect(menuButton).toHaveAttr("aria-expanded", "false"),
    expect(menuButton).toHaveAttr("aria-controls", "docs-sidebar"),
    expect(drawer).toHaveAttr("id", "docs-sidebar"),
    expect(layout).toHaveAttr("data-mobile-nav", "closed"),
    click(menuButton),
    expect(menuButton).toHaveAttr("aria-expanded", "true"),
    expect(layout).toHaveAttr("data-mobile-nav", "open"),
    click(menuButton),
    expect(menuButton).toHaveAttr("aria-expanded", "false"),
    expect(layout).toHaveAttr("data-mobile-nav", "closed"),
    Command.expectNone()
  );
});

it("escape inside the open drawer shuts it and puts focus back on the menu button", () => {
  scene(
    { update, view },
    given(docsPage),
    click(menuButton),
    keydown(layout, "Escape"),
    expect(menuButton).toHaveAttr("aria-expanded", "false"),
    expect(layout).toHaveAttr("data-mobile-nav", "closed"),
    Command.expectExact(MoveFocus({ selector: "#docs-menu-button" })),
    Command.resolve(MoveFocus, Message.CompletedMoveFocus()),
    Command.expectNone()
  );
});

it("the phone contents bar starts shut, opens from its summary, and names the page heading first", () => {
  const headingRow = within(
    mobileToc,
    role("link", { name: "What is Hypertask?" })
  );

  scene(
    { update, view },
    given(docsPage),
    expect(mobileToc).toHaveAttr("open", "false"),
    expect(mobileTocCurrent).toHaveText("What is Hypertask?"),
    expect(headingRow).toHaveAttr("href", "#_top"),
    expect(headingRow).toHaveAttr("aria-current", "true"),
    click(mobileTocToggle),
    expect(mobileToc).toHaveAttr("open", "true"),
    Command.expectNone()
  );
});

it("choosing a section in the phone contents bar shuts it", () => {
  scene(
    { update, view },
    given(docsPage),
    click(mobileTocToggle),
    inside(
      selector("#docs-mobile-toc"),
      click(role("link", { name: "Install the CLI" }))
    ),
    expect(mobileToc).toHaveAttr("open", "false"),
    Command.expectNone()
  );
});

it("a tap outside the phone contents bar shuts it", () => {
  scene(
    { update, view },
    given(docsPage),
    click(mobileTocToggle),
    Subscription.emit(Message.ClickedOutsideMobileToc()),
    expect(mobileToc).toHaveAttr("open", "false"),
    Command.expectNone()
  );
});

it("escape in the phone contents bar shuts it and puts focus back on its summary", () => {
  scene(
    { update, view },
    given(docsPage),
    click(mobileTocToggle),
    keydown(mobileToc, "Escape"),
    expect(mobileToc).toHaveAttr("open", "false"),
    Command.expectExact(MoveFocus({ selector: "#docs-mobile-toc-summary" })),
    Command.resolve(MoveFocus, Message.CompletedMoveFocus()),
    Command.expectNone()
  );
});

it("the phone contents bar shows the section being read and marks its row", () => {
  scene(
    { update, view },
    given(docsPage),
    Subscription.emit(
      Message.MeasuredReadingAnchor({ id: Option.some("install-the-cli") })
    ),
    expect(mobileTocCurrent).toHaveText("Install the CLI"),
    expect(
      within(mobileToc, role("link", { name: "Install the CLI" }))
    ).toHaveAttr("aria-current", "true"),
    expect(
      within(mobileToc, role("link", { name: "Choose your interface" }))
    ).toHaveAttr("aria-current", "false"),
    Command.expectNone()
  );
});

it("the phone breadcrumb names the section and the page", () => {
  scene(
    { update, view },
    given(docsPage),
    expect(selector(".docs-breadcrumb")).toContainText("Getting started"),
    expect(selector(".docs-breadcrumb")).toContainText("What is Hypertask?"),
    expect(selector(".docs-breadcrumb")).toContainText("\u203A"),
    Command.expectNone()
  );
});

it("the current section is the last heading that has passed the reading line", () => {
  const headings = [
    { id: "intro", top: -420 },
    { id: "boards", top: -80 },
    { id: "tasks", top: 240 },
  ];

  assert(Option.getOrNull(currentHeadingId(headings, 92))).toBe("intro");
  assert(Option.getOrNull(currentHeadingId(headings, 160))).toBe("intro");
  assert(Option.getOrNull(currentHeadingId(headings, 161))).toBe("boards");
  assert(Option.getOrNull(currentHeadingId(headings, 999))).toBe("tasks");
  assert(currentHeadingId(headings, -421)).toEqual(Option.none());
  assert(currentHeadingId([], 0)).toEqual(Option.none());
});
