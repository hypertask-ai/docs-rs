# docs-rs verification map

This directory is the maintained source for verifying that the docs site this repo publishes under `/ratstack` looks, reads and behaves like the live site at `https://docs.hypertask.ai/`. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- The live site answers `200 text/html` at `https://docs.hypertask.ai/` and is not `noindex`.
- The preview answers `200 text/html` at `https://docs.hypertask.ai/ratstack/`, carries `noindex` in both the `X-Robots-Tag` header and the robots meta tag, and answers with `X-Content-Generation`.
- `node .claude/skills/verify-docs-rs/doctor.mjs` prints `doctor: PASS`.
- One evidence folder per run, outside the clone: `RUN="${DOCS_VERIFY_EVIDENCE:-/tmp/docs-verify-evidence}/run-$(date -u +%Y%m%dT%H%M%SZ)"`.
- Playwright 1.65.1 resolves from the checkout; the doctor prints the version it finds.
- Nothing is started: the preview is published by GitHub and the live site is the reference.

## Driving conventions

- Treat every command as literal. Keep quoted names, addresses and flags unchanged.
- Addresses on the preview are the live address with `/ratstack` in front.
- `GET` only on both hosts. Never post, never send a chat message, never log in. The help chat launcher is an address to check, never a conversation to start.
- Prefer the accessible names and stable handles this map names over class names or coordinates.
- Capture the action and the resulting state, not only the final screen.
- Record the `X-Content-Generation` value the doctor prints with every proof.
- The run changes no data on either host, so there is nothing to restore.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- A proof includes `text-diff.txt`, `links-diff.txt`, `head.json` and the live and preview screenshots at both widths.
- Report an address the preview does not serve as a FAIL with its status, its title and the visible difference. Put the reason in that feature's Gotchas.
- Do not report a skipped entry point as verified through a different address.
- A journey whose precondition the preview lacks is a FAIL, never a weaker journey.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with drive.mjs` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Home page](./home-page.md) covers the lead line, the ask bar, the two interface cards, the install block and the Next link.
- [Docs page chrome](./docs-page-chrome.md) covers the header, the section tabs, the sidebar, the right-hand contents, the per-page actions and the footer.
- [Search](./search.md) covers the header search button, the dialog, ranked results and the cleared state.
- [Changelog](./changelog.md) covers the list, the area filter, an entry page and the RSS feed.
- [Markdown copies](./markdown-copies.md) covers the `.md` copy of a page and the `llms` files.
