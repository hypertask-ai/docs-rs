export interface DocsExportEntry {
  readonly description: string;
  readonly routePath: string;
  readonly title: string;
}

export interface DocsExportPage extends DocsExportEntry {
  readonly body: string;
}

const docsSections = [
  { prefix: "getting-started/", title: "Getting started" },
  { prefix: "features/", title: "Features" },
  { prefix: "mcp/", title: "MCP" },
  { prefix: "api/", title: "API" },
  { prefix: "cli/", title: "CLI" },
] as const;

const docsTitle = "# Hypertask";

const docsSummary =
  "> Hypertask is a task board where people and AI agents work together. These docs cover boards, tasks, agents, the CLI, MCP and the API.";

const connectAgentSummary =
  "Create an agent, copy its token, give it board access and connect it with the CLI or MCP.";

const oneLine = (text: string): string =>
  text
    .replace(/\s+/gu, " ")
    .replace(/ ?\u2014 ?/gu, ", ")
    .trim();

const pageUrl = (origin: string, routePath: string): string =>
  `${origin}${routePath}/`;

const listedInLlms = (routePath: string): boolean =>
  routePath !== "/" && !routePath.startsWith("/changelog");

export const isDocsRoute = (routePath: string): boolean =>
  routePath === "/connect-an-agent" ||
  docsSections.some((section) => routePath.startsWith(`/${section.prefix}`));

export const docsPageMarkdown = (page: DocsExportPage): string => {
  const header = [`# ${page.title}`, page.description]
    .filter((part) => part !== "")
    .join("\n\n");

  return `${header}\n\n${page.body}\n`;
};

export const docsLlmsText = (
  origin: string,
  entries: readonly DocsExportEntry[]
): string => {
  const listed = entries
    .filter((entry) => listedInLlms(entry.routePath))
    .toSorted((left, right) => left.routePath.localeCompare(right.routePath));

  const line = (entry: DocsExportEntry): string =>
    `- [${entry.title}](${pageUrl(origin, entry.routePath)})${entry.description === "" ? "" : `: ${oneLine(entry.description)}`}`;

  const output = [
    docsTitle,
    "",
    docsSummary,
    "",
    "## Start here",
    "",
    `- [Connect a new agent](${origin}/connect-an-agent/): ${connectAgentSummary}`,
    `- [Full documentation as one file](${origin}/llms-full.txt)`,
    "",
  ];

  for (const section of docsSections) {
    const items = listed.filter((entry) =>
      entry.routePath.startsWith(`/${section.prefix}`)
    );

    if (items.length > 0) {
      output.push(
        `## ${section.title}`,
        "",
        ...items.map((entry) => line(entry)),
        ""
      );
    }
  }

  return output.join("\n");
};

export const docsLlmsFull = (
  origin: string,
  pages: readonly DocsExportPage[]
): string => {
  const listed = pages
    .filter((page) => listedInLlms(page.routePath))
    .toSorted((left, right) => left.routePath.localeCompare(right.routePath));
  const ordered = [
    ...listed.filter((page) => page.routePath === "/connect-an-agent"),
    ...listed.filter((page) => page.routePath !== "/connect-an-agent"),
  ];

  return [
    "# Hypertask documentation",
    "",
    ...ordered.flatMap((page) => [
      `# ${page.title}`,
      `Source: ${pageUrl(origin, page.routePath)}`,
      "",
      page.body,
      "",
    ]),
  ].join("\n");
};
