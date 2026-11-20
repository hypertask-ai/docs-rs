# Markdown copies

Every docs page has a markdown copy a visitor can read or hand to an agent, and the site publishes curated `llms` files. The preview must serve the same copies with the same words and the same content types.

## Sub-features

- `markdown-page` serves the markdown copy of a docs page, such as `/getting-started/quickstart.md`.
- `markdown-changelog` serves the markdown copy of one changelog entry.
- `llms-index` serves `/llms.txt` as the curated index an agent reads first.
- `llms-full` serves `/llms-full.txt` with every page in one file.
- `llms-small` stays absent: `/llms-small.txt` answers `404` on both hosts.

## How to get to it (user POV)

- Choose `View as markdown` under a page title.
- Open `https://docs.hypertask.ai/getting-started/quickstart.md` in a browser.
- Point an agent at `https://docs.hypertask.ai/llms.txt`.

## Driving it with drive.mjs

Preconditions:

- `doctor.mjs` prints `doctor: PASS`.
- `$RUN` is the evidence folder for this run.

- **Fetch both copies.** Run `mkdir -p "$RUN/markdown"` and then `curl -sS -o "$RUN/markdown/live-quickstart.md" -w '%{http_code} %{content_type}\n' https://docs.hypertask.ai/getting-started/quickstart.md`, and the same for `https://docs.hypertask.ai/ratstack/getting-started/quickstart.md` into `preview-quickstart.md`. Both must answer `200 text/markdown`.
- **Compare the words.** Run `diff -u "$RUN/markdown/live-quickstart.md" "$RUN/markdown/preview-quickstart.md" | tee "$RUN/markdown/quickstart.diff"`. The only lines allowed to differ are an address that gains `/ratstack`.
- **Compare the curated index.** Run the same pair of fetches for `/llms.txt` and `/llms-full.txt`, then `diff -u` each pair with the same rule. Both must answer `200 text/plain`.
- **Check the absent file.** Run `curl -sS -o /dev/null -w '%{http_code}\n' https://docs.hypertask.ai/llms-small.txt` and the same with `/ratstack/llms-small.txt`. Both must answer `404`.
- **Look at a copy in the browser.** Run `node .claude/skills/verify-docs-rs/drive.mjs page https://docs.hypertask.ai/ratstack/getting-started/quickstart.md "$RUN" preview-markdown`. The command records the status, the head tags, the visible text and a screenshot of what the browser shows.

## Gotchas

- The markdown copy is served as a file, so a browser screenshot shows plain text. Use the fetched file and the diff as the proof, and the screenshot only as a record of the content.
- A markdown copy that answers `200` with `text/html` is the site's error page, not a copy. Always read the content type.
- The changelog copies exist per entry. `/changelog/index.md` is `404` on purpose.
- The copies carry addresses inside their bodies. A copy whose only difference is a `/ratstack` prefix is correct.
- The `llms` files have no page chrome, so `drive.mjs page` reports an empty link list for them. That is expected, not a regression.
