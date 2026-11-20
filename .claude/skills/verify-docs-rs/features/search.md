# Search

Search lets a visitor find docs pages by their words. The header carries a search button, the dialog opens from that button, and results arrive as links with page titles and excerpts. The preview must build the same index and rank the same results.

## Sub-features

- `search-open` opens the dialog named `Search docs` from the header button, with an empty result list.
- `search-query` returns ranked results for a query, with the same link texts in the same order as the live site.
- `search-clear` appears once a query has run and returns the dialog to an empty input and an empty result list.

## How to get to it (user POV)

- Choose the search button `Search docs` in the header of any docs page.
- Press `Ctrl` and `K`, or `⌘` and `K`, on any docs page.
- Open the preview at `https://docs.hypertask.ai/ratstack/getting-started/quickstart/` and choose the same button.

## Driving it with drive.mjs

Preconditions:

- `doctor.mjs` prints `doctor: PASS`.
- `$RUN` is the evidence folder for this run.

- **Open search and query both hosts.** Run `node .claude/skills/verify-docs-rs/drive.mjs search https://docs.hypertask.ai/getting-started/quickstart/ https://docs.hypertask.ai/ratstack/getting-started/quickstart webhook "$RUN" search`. The command chooses the button named `Search docs`, reads the empty result list, fills the textbox named `Search docs` with `webhook`, waits for results, and prints `search: PASS` when both hosts open empty and return the same link texts in the same order.
- **Read the result list.** Open `$RUN/search/search.json`. The live side lists the result link texts in order and the preview side lists its own; the first link today reads `Agent webhooks` on both. The list holds more links than results, because each result carries extra links such as `Details`.
- **Look at the dialog and the results.** Open `$RUN/search/live-dialog.png` and `$RUN/search/preview-dialog.png` for the open dialog, then `$RUN/search/live-results.png` and `$RUN/search/preview-results.png` for the populated list.
- **Check that Clear empties the dialog.** The same command records the dialog's link count before the query and after choosing `Clear`, and prints a FAIL line when either count is not zero. Open `$RUN/search/live-cleared.png` and `$RUN/search/preview-cleared.png`: each shows the dialog with an empty input and no results.

## Gotchas

- The index is built at publish time. A preview without a built index returns no results, which is a FAIL with the reason, not a search that is "not ready".
- Results arrive after a debounce. The driver waits for the result list to settle, so never replace the wait with a fixed sleep.
- Search only opens from a page the preview actually serves. A `404` page stops the journey with the status, because the error page can still carry the live site's search script and would look like a pass.
- The dialog opens with an empty result list on the live site, so a preview that lists results before a query is a difference and the driver reports it.
- There is no reliable empty state to drive: a nonsense query such as `watermelonvillage` still returns fuzzy matches. Prove the cleared dialog instead, and never report a fuzzy match as an empty state.
- `Clear` sits inside the dialog and is labelled `Clear` on the live site. If a preview renames it, the command reports that it found no `Clear` control and the count after clear stays `null`.
