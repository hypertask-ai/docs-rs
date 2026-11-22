---
name: verify-docs-rs
description: Prove that the docs site this repo publishes under /ratstack looks, reads and behaves like the live docs site at docs.hypertask.ai. Use when a docs change must be checked against the old site, with screenshots, text and link diffs, and head tags.
---

# Verify docs-rs

This is the scripted way to prove that the new docs site at `$PREVIEW_URL` matches the live docs site at `https://docs.hypertask.ai/`. It drives both hosts in headless Chromium with Playwright, compares what a visitor sees, and saves the evidence.

Drive one feature from the map at a time. `features/README.md` is the index.

`drive.mjs` imports its page capture from `verify/driver.mjs`, the driver the pstack verifier uses, so page text, links, head tags, screenshots and console errors are collected one way in this repo. Extend `verify/driver.mjs` when a capture field is missing; do not fork it here.

## Launch

The instance under test is the preview, and the old live site is the reference. The preview address comes from `PREVIEW_URL`: the doctor reads it, and `drive.mjs` takes it as an argument, so pass `$PREVIEW_URL` in place of the published origin the feature files spell.

The pstack verifier builds this checkout with `SITE_BASE_PATH=/ratstack` the way `.github/workflows/publish-ratstack.yml` builds it and serves the built output on `127.0.0.1`, so on the runner `$PREVIEW_URL` is that local build and nothing is published. The publish workflow itself runs on every push to `main` and deploys the docs Worker declared in `apps/infra/alchemy.docs-ratstack.ts`.

- Ready means `$PREVIEW_URL` answers `200` with an `X-Content-Generation` header. Run the doctor before driving.
- On the published host the preview is the current build when the newest successful publish run on `main` has no site change after it. `doctor.mjs` reads the run list with `gh run list --workflow=publish-ratstack.yml --branch=main --repo=hypertask-ai/docs-rs` and counts the commits on `origin/main` after that run's head that touch `.brain`, `apps/web`, `apps/site` and `packages`. Zero commits means the preview is current.
- Record the `X-Content-Generation` value with every proof so two runs can be told apart.

There is nothing to tear down after a run: the driver starts no server of its own, and the job that serves a local build stops it when it ends. The doctor fetches `origin/main` into the clone and writes nothing else.

## Doctor

One read-only check that answers whether the preview is worth driving.

```sh
node .claude/skills/verify-docs-rs/doctor.mjs
```

It checks these and prints one line each:

1. `playwright` resolves from this checkout, and it prints the version it found;
2. the live site answers `200 text/html` and is not `noindex`;
3. `$PREVIEW_URL` answers `200 text/html`;
4. the preview carries `noindex` in both the `X-Robots-Tag` header and the `<meta name="robots">` tag, and answers with `X-Content-Generation`;
5. when `$PREVIEW_URL` is the published host, the preview is the newest publish: the newest successful publish run on `main` has no site change after it. A local build on the runner skips this, because the job that served it is the freshness check.

`doctor: PASS` means drive. A `FAIL` line names the fix. A `SKIP` line means the check could not run, usually because the publish workflow is not on `main` yet or because the preview is a local build; a skip does not pass the check.

When the preview answers anything other than `200` at an address the built site writes, that address is missing from the preview. That is a real FAIL of the journey, never a reason to weaken it. Record the status, the title and the reason, and keep going only to capture the visible difference.

## Drive

Playwright with Chromium. The driver finds the installed browser under `$HOME/.cache/ms-playwright` or `/usr/bin/google-chrome`, so nothing is downloaded.

Each command writes its artifacts into `<evidence-dir>/<name>/` and prints a verdict. The driver always closes the browser it started.

```sh
node .claude/skills/verify-docs-rs/drive.mjs page <url> <evidence-dir> <name>
node .claude/skills/verify-docs-rs/drive.mjs diff <live-url> <preview-url> <evidence-dir> <name>
node .claude/skills/verify-docs-rs/drive.mjs search <live-url> <preview-url> <query> <evidence-dir> <name>
node .claude/skills/verify-docs-rs/drive.mjs changelog <live-url> <preview-url> <area> <evidence-dir> <name>
```

- `page` captures one address: status, head tags, visible text, links, console errors and full-page screenshots at desktop `1440x900` and phone `390x844`.
- `diff` captures a live address and its preview address the same way, then writes `text-diff.txt`, `links-diff.txt`, `head.json` and `pages.json`, and prints `PASS` or `FAIL` with each difference. Four screenshots show live and preview side by side at both widths.
- `search` opens the search dialog, types a query, and records the result links before and after, plus screenshots.
- `changelog` reads the update count, chooses an area, and records the count line before and after, plus screenshots.

Addresses on the preview are the live address with `/ratstack` in front. The driver records each final URL after redirects and normalizes paths before it compares, so a difference in the address itself appears in the two status lines, not as a false text difference.

`drive.mjs` imports `playwright` from this checkout, the same install the verifier and CI use, and the doctor prints the version it finds. A clone with no dependencies fails that doctor line. Link an existing install into the clone before driving, for example `ln -s /path/to/a/checkout/node_modules node_modules`, and never commit the link.

Stable handles, used by the driver and named in every feature file:

- the header search button and the dialog are both named `Search docs`;
- the search input is the dialog's only `textbox` and its placeholder and accessible name are `Search docs`;
- the `Clear` button sits inside the search dialog and appears once a query has run;
- the section tabs are `nav[aria-label="Documentation sections"]`;
- the sidebars are `<summary>` groups labelled `Getting started`, `Explore the platform` and `Reference`;
- the right-hand contents list is a `<details>` whose summary reads `On this page`;
- the previous and next links are `.pagination-links a`;
- the changelog area select is the page's only `combobox`, and its first option reads `All areas`;
- the changelog count is the page's `[aria-live]` status.

## Evidence

Evidence lives outside the clone, in the folder named by `$DOCS_VERIFY_EVIDENCE`, default `/tmp/docs-verify-evidence`, under one folder per run named `run-<UTC timestamp>`. Create it once per run and pass it as `<evidence-dir>`:

```sh
export RUN="${DOCS_VERIFY_EVIDENCE:-/tmp/docs-verify-evidence}/run-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN"
```

- A proof includes the live and preview screenshots at both widths, the text diff, the link diff and the head tags.
- Capture the action and the resulting state, not only the final screen. The `search` and `changelog` commands record the before and after values and screenshot both.
- Compare what a visitor sees. Never assert on a class name or a source file.
- A run that drives an address the preview does not serve is a FAIL with the status and the visible difference. Write the reason into the feature's Gotchas and do not drop the journey.
- Cleanup never deletes evidence. Confirm the run folder still holds the screenshots after the run ends.

## Cleanup

The run starts nothing but its own browser, so there is nothing else to tear down.

- Every driver command closes the Chromium it launched in a `finally` block, so a failed capture still leaves no browser behind.
- The doctor launches no browser.
- Never kill a browser by process name: that kills other agents' runs.
- Nothing is removed from the evidence folder.

## Helpers

| Helper | Invocation | What it does |
| --- | --- | --- |
| `doctor.mjs` | `node .claude/skills/verify-docs-rs/doctor.mjs` | Read-only check that the live site and the preview are worth driving |
| `drive.mjs page` | `node .claude/skills/verify-docs-rs/drive.mjs page <url> <evidence-dir> <name>` | Captures one address at both widths |
| `drive.mjs diff` | `node .claude/skills/verify-docs-rs/drive.mjs diff <live-url> <preview-url> <evidence-dir> <name>` | Compares a live address with its preview address |
| `drive.mjs search` | `node .claude/skills/verify-docs-rs/drive.mjs search <live-url> <preview-url> <query> <evidence-dir> <name>` | Drives the search dialog on both hosts and compares results |
| `drive.mjs changelog` | `node .claude/skills/verify-docs-rs/drive.mjs changelog <live-url> <preview-url> <area> <evidence-dir> <name>` | Drives the changelog area filter on both hosts and compares the count line |

## Feature map

`features/README.md` is the index. Read it before driving, then use the matching feature file as the recipe. The map is the maintained source for this repo's verification: a proof that drives one convenient address is incomplete when the map lists others.
