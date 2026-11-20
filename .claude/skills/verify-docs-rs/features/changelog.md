# Changelog

The changelog lists every product update newest first, with a count line, an area filter and one page per update. It is the one docs section with no sidebar and no contents list.

## Sub-features

- `changelog-list` lists updates newest first under month headings, with a count line such as `638 updates`.
- `changelog-filter` narrows the list by area and rewrites the count line, such as `1 update in AI Chat`.
- `changelog-entry` shows one update with its date, its tag chips, its body and a back link to all updates.
- `changelog-rss` serves the same updates as an RSS 2.0 feed at `/changelog.xml`.

## How to get to it (user POV)

- Choose `Changelog` in the section tabs of any docs page.
- Open `https://docs.hypertask.ai/changelog/` and its preview at `https://docs.hypertask.ai/ratstack/changelog/`.
- Choose an update card to read one entry, then choose `Back to all updates`.

## Driving it with drive.mjs

Preconditions:

- `doctor.mjs` prints `doctor: PASS`.
- `$RUN` is the evidence folder for this run.

- **Compare the list and the filter.** Run `node .claude/skills/verify-docs-rs/drive.mjs changelog https://docs.hypertask.ai/changelog/ https://docs.hypertask.ai/ratstack/changelog/ "AI Chat" "$RUN" changelog`. The command reads the count line, chooses `AI Chat` in the area select, reads the count line again, and prints `changelog: PASS` when both hosts go from a count of updates to a count that names the area.
- **Read the counts.** Open `$RUN/changelog/changelog.json`. The counts move as updates land, so compare the shape, never the number across two days.
- **Look at both states.** Open `$RUN/changelog/live-all.png` and `$RUN/changelog/preview-all.png` for the full list, then `$RUN/changelog/live-area.png` and `$RUN/changelog/preview-area.png` for the filtered list.
- **Compare one entry.** Take an id from the live feed with `curl -sS https://docs.hypertask.ai/changelog.xml` and run `node .claude/skills/verify-docs-rs/drive.mjs diff https://docs.hypertask.ai/changelog/<id>/ https://docs.hypertask.ai/ratstack/changelog/<id>/ "$RUN" chunk` with the id in place of `<id>`. The entry must carry the same date, tags and body, and no sidebar and no contents list on either side.
- **Check the feed.** Run `curl -sS -o "$RUN/changelog/live.xml" -w '%{http_code} %{content_type}\n' https://docs.hypertask.ai/changelog.xml` and the same with `/ratstack/changelog.xml`. Both must answer `200 application/xml`, and `grep -o '<item>'` on both files must report the same item count.

## Gotchas

- The update count grows every day. Compare the line's shape and the area name, never the number, and never across two different days.
- `/changelog/index.md` is `404` on purpose. Only `/changelog/<id>.md` exists.
- The area select has no accessible label of its own and its first option reads `All areas`, so it is the page's only `combobox`. Static HTML on the page uses `aria-label="Areas"` on other elements, so never select by that label.
- The changelog page has one `nav`, the section tabs. It has no sidebar and no contents list; a preview that shows them there is a difference worth reporting, not a docs page that passed.
- The count line is the page's only `[aria-live]` status. A preview that renders the count outside a live region breaks that handle and must go in this list before the journey can be trusted again.
