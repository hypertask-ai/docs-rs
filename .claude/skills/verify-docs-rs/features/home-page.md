# Home page

The home page is the first address a visitor lands on. It carries the product H1, the lead line, an ask bar that opens the help chat, two interface cards, the install block and a Next link into the docs. The preview must carry the same words, the same links and the same head tags.

## Sub-features

- `home-lead` shows the H1 `Hypertask documentation` and the lead line `Learn how people and AI agents share one board, and how to connect yours.`
- `home-ask` shows the ask bar `Ask a question about Hypertask…` with its `⌘ I` hint and points it at `https://help.hypertask.ai/help`.
- `home-cards` shows the two interface cards `Web App` and `MCP for AI agents` with their `Open the app guide` and `Connect an agent` links.
- `home-install` shows the install block with `npm install -g @hypertask/hypertask`.
- `home-next` ends the page with the `Next What is Hypertask?` link.

## How to get to it (user POV)

- Open `https://docs.hypertask.ai/` in a browser.
- Open the preview at `https://docs.hypertask.ai/ratstack/`.
- Choose the wordmark in the header of any docs page.

## Driving it with drive.mjs

Preconditions:

- `doctor.mjs` prints `doctor: PASS`, and the doctor printed the `X-Content-Generation` value to record with this proof.
- `$RUN` is the evidence folder for this run.

- **Compare both addresses.** Run `node .claude/skills/verify-docs-rs/drive.mjs diff https://docs.hypertask.ai/ https://docs.hypertask.ai/ratstack/ "$RUN" home`. The command prints `home: PASS` when no live line or link is missing from the preview, no line or link appears only on the preview, and the title, description, language and canonical path match.
- **Read the differences.** Open `$RUN/home/text-diff.txt`, `$RUN/home/links-diff.txt` and `$RUN/home/head.json`. Every `-` line is on the live site and missing from the preview. Every `+` line is on the preview only.
- **Look at both widths.** Open `$RUN/home/live-desktop.png`, `$RUN/home/preview-desktop.png`, `$RUN/home/live-phone.png` and `$RUN/home/preview-phone.png`. The preview carries `noindex` in the head, which is the only head tag allowed to differ.
- **Proof of the ask bar.** In `links-diff.txt` the `https://help.hypertask.ai/help` link keeps the text `Ask a question about Hypertask…`. Open it only as an address; never send a message in the chat.

## Gotchas

- The preview answers `404` until the publish slice lands on `main`. That is a FAIL with the status and the preview title, not a reason to compare a different address. That `404` is the old site's own error page, so its title `404 | Hypertask Docs` and its `/404` canonical describe the fallback, not the new home page.
- The H1 sits inside `main` on the live page. Compare the whole page text, not only the article body, because the ask bar and the cards sit outside it.
- The ask bar is a link into the help chat. Checking it means reading its address and text, never starting a conversation.
- The live canonical is the full address with a trailing slash. The preview may add `/ratstack`; the driver normalizes that prefix, so a canonical that differs by anything else is a FAIL.
- The live page carries a theme picker (`Select theme`, `Dark`, `Light`, `Auto`). The preview must keep the same control and the same three choices.
