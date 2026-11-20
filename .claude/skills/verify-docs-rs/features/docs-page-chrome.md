# Docs page chrome

Every docs page carries the same chrome: a header with the wordmark and the search slot, five section tabs, a left sidebar of three groups, a right-hand contents list with previous and next links, four per-page actions under the title, and a footer. The preview must keep all of it, word for word and in the same order.

## Sub-features

- `chrome-header` shows the wordmark, the `Docs` label, the search button `Search docs`, the `Help` link and the `Open app` link.
- `chrome-tabs` shows five tabs in order, `Getting started`, `Web App`, `MCP for AI agents`, `CLI reference`, `Changelog`, with the current section marked `aria-current="page"`.
- `chrome-sidebar` shows three collapsible groups in order, `Getting started`, `Explore the platform` and `Reference`, with the current page marked `aria-current="page"`.
- `chrome-contents` shows the `On this page` details list with one entry per heading, and the `Previous` and `Next` links in sidebar order.
- `chrome-actions` shows `Copy page`, `Open in Claude`, `Open in ChatGPT` and `View as markdown`, with the markdown action pointing at the page's `.md` copy.
- `chrome-footer` ends the page with `© 2026 Hypertask Lab Ltd.` and keeps the Fathom and help chat scripts.
- `chrome-kicker` shows the sidebar group name above the H1, such as `Explore the platform` on a Web App page.

## How to get to it (user POV)

- Open any docs page, such as `https://docs.hypertask.ai/features/boards/`.
- Open the same page on the preview at `https://docs.hypertask.ai/ratstack/features/boards/`.
- Use the section tabs to move between the five sections, and the sidebar groups to move between pages in one section.

## Driving it with drive.mjs

Preconditions:

- `doctor.mjs` prints `doctor: PASS`.
- `$RUN` is the evidence folder for this run.

- **Compare a Web App page.** Run `node .claude/skills/verify-docs-rs/drive.mjs diff https://docs.hypertask.ai/features/boards/ https://docs.hypertask.ai/ratstack/features/boards/ "$RUN" boards`. The command prints `boards: PASS` when the tabs, the sidebar, the contents list and the footer carry the same words in the same links.
- **Read the link diff.** Open `$RUN/boards/links-diff.txt`. A missing tab, sidebar entry, contents entry or previous or next link appears as a `-` line with its address and text.
- **Look at both widths.** Open `$RUN/boards/live-desktop.png` and `$RUN/boards/preview-desktop.png` for the sidebar and the contents list, and `$RUN/boards/live-phone.png` and `$RUN/boards/preview-phone.png` for the phone layout, where the tabs and the header links collapse.
- **Compare a second section.** Repeat the command with `https://docs.hypertask.ai/mcp/overview/` and `https://docs.hypertask.ai/ratstack/mcp/overview/`, naming the run `mcp`. The tab marked current moves from `Web App` to `MCP for AI agents`.
- **Proof of the handles.** In `$RUN/boards/pages.json` the links carry the tab and sidebar addresses, and `head.json` carries the title and description of the page on both hosts.

## Gotchas

- The sidebar groups are `<details>` elements a visitor can collapse. Each driver run opens a fresh browser context, so it always reads the default open state.
- The right-hand contents list is also a `<details>` whose summary reads `On this page`. It has no ARIA label, so select it by that summary text.
- The `Previous` and `Next` links carry a two-line accessible name, the word and the page title, such as `Previous What AI chat can do`. Compare the pair, not the first word.
- The section tabs sit in `nav[aria-label="Documentation sections"]`, and the current tab is also marked `aria-current="page"`. A page has more than one current marker, one for the section and one for the page.
- The per-page actions sit under the title, and the copy action changes its label to `Copied` for a moment. Read the labels once the page has loaded, before choosing anything.
- The markdown action points at the page's `.md` copy, which is an address on the preview with `/ratstack` in front. A missing copy is the markdown feature's FAIL, reported there.
- The changelog section has no sidebar and no contents list. Do not drive it as a docs page.
