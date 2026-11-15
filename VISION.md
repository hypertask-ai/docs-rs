# Vision

This repository is the new home of docs.hypertask.ai, the documentation site for Hypertask. It rebuilds the Astro Starlight site on Rat Stack as a Foldkit reader on a Cloudflare Worker. A reader should notice nothing.

## What the docs are for

People use the docs to get started with Hypertask, learn a feature, look up an MCP tool or a CLI command, and read what changed. Agents read the same pages as markdown and through MCP. A page answers what someone can do, in their words, with the example first.

## What must not change

- Every live address: the guide pages, the changelog entries, the generated references, the markdown copies, the llms files, the feeds and the redirects.
- The look. The old site's dark theme, typography, header, sidebar, code blocks and page frame carry over. This site does not take Rat Stack's look and does not take Foldkit's default look.
- Search, the MCP read tools, the Fathom tag and the help chat.
- The changelog's month by month index and its three feeds.
- The generated reference pages, refreshed from the live tools and the released CLI on the same 30 minute timer.

## What changes

- Publishing runs from GitHub on every merge to `main`. Nothing is built or deployed on our servers.
- The reader is Foldkit screens with StyleX styles, served by a Worker instead of Astro on Pages.
- Pages and changelog entries live in `.brain`, so the site has one content source and one converter.
- Search becomes a docs index behind a contract, and the MCP surface is built from the same contracts.
- The strict Rat Stack gate runs on every push: types, lint, format, tests and build. No rule is loosened to make a change pass.

## How the move runs

20 small steps on https://app.hypertask.ai/detail/project-15/9125. The old site keeps serving docs.hypertask.ai until the new one matches it on a preview. The last step removes the old code; no live content is deleted. Undo any step by reverting it, and undo the cutover by pointing docs.hypertask.ai back at the old Pages project.

## Who it is for

People using Hypertask, the agents that read the docs as markdown and through MCP, and the people who write and review pages. `AGENTS.md` holds the rules, `internal/` holds engineering notes that never publish, and the inherited Rat Stack `README.md` describes the stack the project starts from.

## Amendment policy

This file belongs to the docs project and changes when the docs' purpose or promises change. Rat Stack's own `VISION.md` describes the reference project, not this one.
