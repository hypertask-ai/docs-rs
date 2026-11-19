# Feature map: docs.hypertask.ai

One row per function in the docs site audit, 85 in all, with the address to try and what to look for. `who` says who meets it: `visitor` is driven in a browser, `machine` is fetched with curl, `repo` is build or CI behaviour that is read from the checkout rather than the served site.

Five addresses answer during a verifier run:

- head, the built files of the change under review: `$SITE_URL`, default `http://127.0.0.1:4173`
- parent, the built files of the commit it is based on: `$BASE_URL`, default `http://127.0.0.1:4174`
- head on the app's own dev server, when it starts: `$SITE_DEV_URL`, default `http://127.0.0.1:4175`
- parent on the app's own dev server, when it starts: `$BASE_DEV_URL`, default `http://127.0.0.1:4176`
- live, today's site and the look and content reference: `https://docs.hypertask.ai`

The built files are exactly what a deploy uploads, so they are the reference for pages, markdown copies, `llms` files, the sitemap and images. The dev server runs the same application in Node, so it is the place to ask what the code does with an unknown address, a trailing slash, `/rpc` and other worker-only routes. It also shows a floating devtools toggle button that the deployed site does not have. A `::notice` in the run and the `serve:` line of the verdict say which of the two answered for each side.

`verify/driver.mjs` opens a page, reports its status, collects its links and structure, records console errors and screenshots it at 1440 and 390 pixels wide. Give it a path to open it on the head site, or a full URL for the parent, the dev servers and the live site.

```sh
node verify/driver.mjs /getting-started/quickstart/ "$SCREENS_DIR" head-quickstart
node verify/driver.mjs "$BASE_URL/getting-started/quickstart/" "$SCREENS_DIR" parent-quickstart
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$SITE_URL/llms.txt"
curl -sS -o /dev/null -w '%{http_code}\n' "${SITE_DEV_URL:-$SITE_URL}/no-such-page"
```

| id | feature | who | try | look for |
| --- | --- | --- | --- | --- |
| F01 | Home page: lead line, ask bar, two interface cards, install block, agent aside | visitor | `/` | dark page, H1 at 48px in Newsreader, two cards, `npm install -g @hypertask/hypertask` block, same words as live |
| F02 | Nine getting-started pages | visitor | `/getting-started/introduction/`, `/quickstart/`, `/switching/`, `/concepts/`, `/settings-profile/`, `/security-and-privacy/`, `/troubleshooting-login/`, `/apps/`, `/contact-support/` | each returns 200, breadcrumb under 50rem, right-hand ToC on desktop, prose matches live |
| F03 | Thirty-three feature pages | visitor | `/features/<slug>/` with the slugs from the live sidebar | every 200, Aside, Tabs, Steps and Card render as they do live, no rewritten sentence |
| F04 | Seven MCP pages | visitor | `/mcp/overview/`, `/agents/`, `/agent-sdk/`, `/agent-webhooks/`, `/scheduling/`, `/troubleshooting/`, `/workflows/` | every 200, code blocks keep their language, prose matches live |
| F05 | Two API pages | visitor | `/api/rest-api/`, `/api/tools-reference/` | REST page built, tools page lists every tool with its parameter table |
| F06 | Three CLI pages | visitor | `/cli/reference/`, `/cli/commands/`, `/cli/tasks-assign/` | command help text stays inside fences, one section per command |
| F07 | Connect an agent page | visitor | `/connect-an-agent/` | the step list to create an agent, copy its token and grant board access |
| F08 | Sidebar: three groups in fixed order, collapse, current-page highlight | visitor | any docs page | 280px rail, three groups in the same order, accent highlight on the current link |
| F09 | Header bar: glyph, wordmark, Docs, search slot, right-hand links | visitor | any page | 72px bar, glyph, wordmark, Docs, search box and the right-hand links |
| F10 | Section tabs with one active tab | visitor | `/`, `/getting-started/quickstart/`, `/features/boards/`, `/mcp/overview/`, `/cli/reference/`, `/changelog/` | five tabs in order Getting started, Web App, MCP for AI agents, CLI reference, Changelog; exactly one `aria-current="page"` |
| F11 | Header links: help and open app | visitor | any page | `help.hypertask.ai/help` and the boxed `app.hypertask.ai/login`, social icons present |
| F12 | Page kicker, the sidebar group name above the H1 | visitor | `/features/boards/` | orange uppercase label such as `EXPLORE THE PLATFORM` |
| F13 | Right-hand table of contents and prev/next links | visitor | two docs pages, two changelog pages | ToC hrefs and text equal to live, prev/next in sidebar order, all three absent on `/changelog/*` |
| F14 | Per-page AI buttons: Copy page, Open in Claude, Open in ChatGPT, View as markdown | visitor | any docs page | four buttons under the title, copy shows Copied then reverts, the markdown link opens the page `.md` |
| F15 | Ask-help bar on the home page and Cmd/Ctrl+I anywhere | visitor | `/` then any docs page | bar with its hint on home, `metaKey` plus `i` calls the widget open, a page with no widget falls back to clicking the launcher |
| F16 | Dark theme forced, no theme picker | visitor | any page | `data-theme="dark"` on `html`, no colour scheme switch |
| F17 | Design tokens and type | visitor | any page | `#d97757` accent, `#0a0a0b` background, IBM Plex Sans and Mono, Newsreader headings, 45rem content width, 17.5rem sidebar |
| F18 | Google Fonts stylesheet and preconnects | machine | curl any page head | three families requested, preconnect to `fonts.googleapis.com` and `fonts.gstatic.com` |
| F19 | Static assets | machine | `/favicon.svg`, `/glyph-white.png`, `/hypertask-logo.png`, `/screenshots/<name>.png` | 200 with the right content type, byte size close to live |
| F20 | Eight screenshots that no page links to | machine | `/screenshots/<name>.png` | 200 on both, still unlinked |
| F21 | Fathom analytics on every page, including 404 and changelog | machine | curl head of `/`, one doc, one changelog, a 404 | the Fathom script and its site id, same id as live |
| F22 | Help chat widget on every page | visitor | `/`, one doc, one changelog, a 404 | floating launcher bottom right, script present on all four |
| F23 | Footer copyright line | visitor | any page including 404 | `© 2026 Hypertask Lab Ltd.` once, centred, hairline above |
| F24 | Mobile layout under 50rem | visitor | 390px wide on five pages | 60px header, tabs and header links hidden, search becomes an icon, breadcrumb `Section › Page` under the header, single-column cards, H1 at 40px |
| F25 | Pagefind index built at publish time | machine | `/pagefind/pagefind.js`, `/pagefind/pagefind-entry.json` | 200, one fragment per page, page count equal to the sitemap count |
| F26 | Search box, Cmd/Ctrl+K, ranked results | visitor | any page, then a query such as `webhook` | 40px box in the header, modal opens, results carry page titles and excerpts |
| F27 | A markdown copy of every docs page | machine | `/getting-started/quickstart.md` plus a sample of pages | 200 `text/markdown`, title and description first, body equal to live |
| F28 | A markdown copy of every changelog entry | machine | `/changelog/<id>.md` for three ids from the live feed | 200, title, summary line, body; `/changelog/index.md` stays 404 |
| F29 | `llms.txt` curated index | machine | `/llms.txt` | 200 `text/plain`, same group headings, same 56 links as live |
| F30 | `llms-full.txt`, every page in one file | machine | `/llms-full.txt` | 200, connect-an-agent first, same section count as live |
| F31 | `llms-small.txt` does not exist | machine | `/llms-small.txt` | 404 on head, parent and live |
| F32 | Changelog list, newest first, grouped by month | visitor | `/changelog/` | two-column grid, month headings, count in a live region, RSS link, area select with JS on |
| F33 | Changelog entry page | visitor | `/changelog/<id>/` | 48rem article, date, tag chips, body, Back to all, no sidebar and no ToC |
| F34 | Changelog area filter | visitor | `/changelog/`, choose an area | cards and empty months hide, the count becomes `N updates in Area` |
| F35 | RSS 2.0 feed | machine | `/changelog.xml` | 200, same item count and field set as live |
| F36 | JSON Feed 1.1 | machine | `/changelog.json` | 200, items with id, title, summary, tags, dates; content type as served today |
| F37 | Markdown feed of the whole changelog | machine | `/changelog.md` | 200, `# Changelog` then one `## title` block per entry |
| F38 | Changelog loader with legacy intake | repo | read the loader in the checkout | the same entries and slugs as live, legacy path kept out of docs routing |
| F39 | Legacy announcement parsing | repo | diff the parsed entries against live titles and ids | title, summary, tags and slug shape unchanged |
| F40 | Duplicate guard across the two sources | repo | read the dedupe keys | one entry per announcement, never two |
| F41 | Changelog format guard | repo | the changelog check command and its output | inventory count and verification line as today |
| F42 | Trailing-slash addresses | machine | `/features/desktop` on head, parent and live | 308 with `Location` at the slashed URL on all three |
| F43 | Old desktop-apps address | machine | `/features/desktop` then follow | ends at `/getting-started/apps/` |
| F44 | 404 page | machine and visitor | `/no-such-page` | 404, H1 `404`, `Page not found. Check the URL or try using the search bar.`, themed like live |
| F45 | Sitemap index and urlset | machine | `/sitemap-index.xml`, `/sitemap-0.xml` | valid XML, same address count as live, every docs head carries the sitemap link |
| F46 | `robots.txt` served by Cloudflare, not the repo | machine | `/robots.txt` | today's content-signals notice, no `Sitemap:` line, same as live |
| F47 | No Functions, no middleware, no `_headers`, no `_redirects` | repo and machine | response headers on a page and an asset | cache-control, referrer-policy, nosniff, allow-origin as today; no site-specific overrides |
| F48 | Docs MCP health check | machine | `GET /` and `GET /health` on the worker host | `{"status":"ok","service":"hypertask-docs-mcp"}` with CORS |
| F49 | Docs MCP CORS | machine | `OPTIONS` any worker path | 200 with allow-origin, allow-headers `Authorization` and `mcp-session-id` |
| F50 | Protected-resource metadata | machine | `GET /.well-known/oauth-protected-resource` | resource origin, authorization servers, scope `mcp:full`, `max-age=3600` |
| F51 | Authorization-server metadata | machine | `GET /.well-known/oauth-authorization-server` | same issuer, endpoints and PKCE settings as live |
| F52 | No bearer token is refused | machine | `POST /mcp` with no header | 401, JSON-RPC `-32001`, `WWW-Authenticate` pointing at the metadata document |
| F53 | A bad or expired token is refused | machine | `POST /mcp` with `Bearer x` | 401, `-32001`, `error="invalid_token"` |
| F54 | Only `/mcp` is served | machine | `GET /nope` on the worker host | 404 `Not found` |
| F55 | Stateless streamable HTTP | machine | `POST /mcp` with a valid token | SSE or JSON-RPC reply, no session id |
| F56 | `tools/list` | machine | `tools/list` over MCP | the same tool names and schemas as live |
| F57 | `list_pages` | machine | `list_pages` over MCP | one entry per page with path, slug, title, description |
| F58 | `read_page` | machine | `read_page` for a known slug and for a missing one | raw page text, or the not-found error text |
| F59 | `read_sidebar_config` | machine | `read_sidebar_config` | the sidebar configuration text |
| F60 | `write_page` with the MDX guard | machine | a broken MDX body, no token for a read-only run | the guard refusal text and no commit |
| F61 | `delete_page` | machine | not driven read-only | behaviour unchanged; say so instead of guessing |
| F62 | `update_sidebar_config` | machine | not driven read-only | behaviour unchanged; say so instead of guessing |
| F63 | `trigger_deploy` | machine | not driven read-only | behaviour unchanged; say so instead of guessing |
| F64 | Local stdio MCP server for a developer laptop | repo | read the server in the checkout | same tool set and replies as today |
| F65 | MCP reference generation | repo | read the generator and the generated tools page | page content derived from the tool list, no hand edit |
| F66 | CLI reference generation | repo | read the generator and the generated CLI page | one section per command |
| F67 | Hand-written reference notes inside generated pages | repo | the generated pages | the login and hello notes still present |
| F68 | Thirty-minute refresh and publish gate | repo | read the refresh worker or workflow | publish only when the gate is on |
| F69 | Refresh failure issue | repo | read the alarm job | one open issue with the run URL, closed when green |
| F70 | Agent login check | repo | read the check | refuses a non-agent token, prints only the outcome |
| F71 | Scheduled-environment guard | repo | read the guard | only the scheduled workflow may name that environment |
| F72 | Nightly check at 03:30 UTC | repo | read the nightly workflow | broken links, markdown exports, llms files, tool and CLI names, live URLs |
| F73 | VPS timers and shell wrapper | repo | search the tree for them | none left in the new repo |
| F74 | Publish on merge to main | repo | read the publish workflow | build, deploy, then the five-URL cache purge after the wait |
| F75 | Deploy failure alarm | repo | read the alarm job | issue opens on failure, closes on the next green run |
| F76 | Build check on every pull request and push | repo | the checks on this pull request | build check present and green |
| F77 | Docs MCP release gate | repo | read the release workflow | release only when the approved SHA matches, writes held off |
| F78 | Secret scan on every push and pull request | repo | the checks on this pull request | the secret scan check is present and green |
| F79 | Outside pull request guard | repo | read the guard | forks and non-collaborators closed with the standard reply |
| F80 | MDX rules before every build | repo | read the rules and the build script | bare placeholders, bad Aside types, missing imports and broken frontmatter all fail the build with file and line |
| F81 | Test suites that gate the above | repo | read the test scripts and the checks on this pull request | the same suites run in CI |
| F82 | Outside writers push docs content into this repo | repo | read the inventory note | writers and their paths unchanged |
| F83 | Named settings and resources | repo | read the workflow and worker references | names only, no value read or printed |
| F84 | Cloudflare resources to adopt rather than create | repo | read the inventory note | zone, Pages project, Worker and deploy hook named, none recreated |
| F85 | Head tags per page type | machine | `/`, `/getting-started/quickstart/`, `/features/boards/`, `/mcp/overview/`, `/cli/reference/`, `/changelog/`, `/changelog/<id>/`, `/no-such-page` | title with the ` \| Hypertask Docs` suffix off home, description, canonical with the trailing slash, og and twitter tags, no og:image, no JSON-LD; changelog pages add the RSS alternate |
