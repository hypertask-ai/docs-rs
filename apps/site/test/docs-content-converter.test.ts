import { expect, it } from "@effect/vitest";

import {
  checkDocsContent,
  convertDocsPage,
  renderConvertedPage,
  routePathOf,
} from "../scripts/docs-content-converter.ts";

const page = `---
title: Quickstart
description: Start here.
sidebar:
  order: 2
---

import { Aside, LinkButton } from '@astrojs/starlight/components';

<Aside type="note" title="Heads up">
Read this first.
</Aside>

<LinkButton href="https://app.hypertask.ai/login">Open app</LinkButton>

<Badge text="New" />

\`\`\`text
<Unknown />
{x}
\`\`\`

Use {placeholder} here.
`;

it("reports the MDX shapes the reader cannot render", () => {
  expect(checkDocsContent(page)).toEqual([
    "8: import belongs to MDX; the reader has no module scope",
    "14: <LinkButton> has no reader component; register it or remove it",
    "16: <Badge> has no reader component; register it or remove it",
    "23: {placeholder} reads as code; write \\{placeholder\\} or put it in backticks",
  ]);
});

it("reports an unknown component and an invalid Aside type", () => {
  expect(
    checkDocsContent(`<Aside type="warning">Careful</Aside>\n<Pill>New</Pill>`)
  ).toEqual([
    '1: <Aside type="warning"> is not valid; use note, tip, caution or danger',
    "2: <Pill> has no reader component; register it or remove it",
  ]);
});

it("converts Starlight components and drops module scope", () => {
  const converted = convertDocsPage(page, "/getting-started/quickstart");

  expect(converted.frontmatter).toBe(
    "description: Start here.\ntitle: Quickstart\n"
  );
  expect(converted.body).not.toContain("import {");
  expect(converted.body).toContain(
    "[Open app](https://app.hypertask.ai/login)"
  );
  expect(converted.body).toContain("New\n");
  expect(converted.body).toContain('<Aside type="note" title="Heads up">');
  expect(converted.problems).toEqual([
    "19: {placeholder} reads as code; write \\{placeholder\\} or put it in backticks",
  ]);
});

it("keeps LinkCard and turns JSX class attributes into HTML ones", () => {
  const converted = convertDocsPage(
    `---
title: Quickstart
description: Start here.
---

<div className="grid">
<LinkCard title="Core Concepts" description="Read the data model." href="/getting-started/concepts/" />
</div>
`,
    "/getting-started/quickstart"
  );

  expect(converted.problems).toEqual([]);
  expect(converted.body).toContain('<div class="grid">');
  expect(converted.body).not.toContain("className");
  expect(converted.body).toContain("<LinkCard");
});

it("puts a multi line component tag on one line so it stays a block", () => {
  const converted = convertDocsPage(
    `---
title: Quickstart
description: Start here.
---

<LinkCard
  title="Core Concepts"
  href="/getting-started/concepts/"
/>
`,
    "/getting-started/quickstart"
  );

  expect(converted.body).toBe(
    '<LinkCard title="Core Concepts" href="/getting-started/concepts/" />'
  );
});

it("keeps module-scope words inside a code fence", () => {
  const converted = convertDocsPage(
    `---
title: Connect a new agent
description: Start here.
---

\`\`\`bash
export HT_TOKEN="<agent token>"
hypertask context
\`\`\`
`,
    "/connect-an-agent"
  );

  expect(converted.problems).toEqual([]);
  expect(converted.body).toContain('export HT_TOKEN="<agent token>"');
  expect(converted.body).toContain("hypertask context");
});

it("renders a converted page with frontmatter and keeps route paths", () => {
  const converted = convertDocsPage(page, "/features/boards");

  expect(renderConvertedPage(converted)).toMatch(/^---\n/u);
  expect(renderConvertedPage(converted)).toContain("\n---\n");
  expect(routePathOf("repo/src/content/docs/index.mdx")).toBe("/");
  expect(
    routePathOf("repo/src/content/docs/getting-started/introduction.mdx")
  ).toBe("/getting-started/introduction");
  expect(routePathOf("repo/src/content/docs/cli/reference.md")).toBe(
    "/cli/reference"
  );
});
