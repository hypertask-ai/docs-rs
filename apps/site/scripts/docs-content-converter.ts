import { Option, Schema } from "effect";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const asideTypes = new Set(["caution", "danger", "note", "tip"]);

export const docsComponentNames: ReadonlySet<string> = new Set([
  "AgentOnly",
  "AgentPointer",
  "Aside",
  "Card",
  "CardGrid",
  "CopyPrompt",
  "Diagram",
  "HumanOnly",
  "Sources",
  "Steps",
  "TabItem",
  "Tabs",
]);

const knownTag = (name: string) => docsComponentNames.has(name);

const maskInlineCode = (line: string) =>
  line.replaceAll(/`+[^`]*`+/gu, (match) => " ".repeat(match.length));

const lineProblems = (line: string, number: number): readonly string[] => {
  const problems: string[] = [];

  for (const match of line.matchAll(/<Aside\b[^>]*\btype="(?<type>[^"]*)"/gu)) {
    if (!asideTypes.has(match.groups?.type ?? "")) {
      problems.push(
        `${number}: <Aside type="${match.groups?.type}"> is not valid; use note, tip, caution or danger`
      );
    }
  }

  for (const match of line.matchAll(/<(?<name>[A-Z]\w*)[\s/>]/gu)) {
    const name = match.groups?.name ?? "";

    if (!knownTag(name)) {
      problems.push(
        `${number}: <${name}> has no reader component; register it or remove it`
      );
    }
  }

  return problems;
};

const placeholderProblems = (line: string, number: number): readonly string[] =>
  [...line.matchAll(/(?<![\\=])\{(?<body>[^{}]*)\}/gu)].flatMap((match) => {
    const body = (match.groups?.body ?? "").trim();

    if (body === "" || body.startsWith("/*")) {
      return [];
    }

    const head = /^[A-Za-z_$][\w$]*/u.exec(body)?.[0];
    const looksLikeCode =
      head !== undefined &&
      !knownTag(head) &&
      /^[A-Za-z_$][\w$ .-]*$/u.test(body);

    return looksLikeCode
      ? [
          `${number}: {${body}} reads as code; write \\{${body}\\} or put it in backticks`,
        ]
      : [];
  });

export const checkDocsContent = (source: string): readonly string[] => {
  const lines = source.split("\n");
  const problems: string[] = [];
  let inFence = false;
  let inFrontmatter = lines[0]?.trim() === "---";

  for (const [index, raw] of lines.entries()) {
    const number = index + 1;

    if (inFrontmatter) {
      if (index > 0 && raw.trim() === "---") {
        inFrontmatter = false;
      }

      continue;
    }

    if (/^\s*(?:```|~~~)/u.test(raw)) {
      inFence = !inFence;

      continue;
    }

    if (inFence) {
      continue;
    }

    if (/^(?:import|export)\s/u.test(raw)) {
      problems.push(
        `${number}: ${raw.split(" ")[0]} belongs to MDX; the reader has no module scope`
      );

      continue;
    }

    const line = maskInlineCode(raw);

    problems.push(
      ...lineProblems(line, number),
      ...placeholderProblems(line, number)
    );
  }

  return problems;
};

const DocsFrontmatter = Schema.Struct({
  description: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
});

const decodeFrontmatter = (source: string): typeof DocsFrontmatter.Type => {
  if (source.trim() === "") {
    return {};
  }

  return Option.getOrElse(
    Schema.decodeUnknownOption(DocsFrontmatter)(parseYaml(source)),
    () => ({})
  );
};

const stripModuleScope = (body: string) =>
  body
    .split("\n")
    .filter((line) => !/^(?:import|export)\s/u.test(line))
    .join("\n");

const linkButtons = (body: string) =>
  body.replaceAll(
    /<LinkButton\b[^>]*\bhref="(?<href>[^"]*)"[^>]*>(?<label>[\s\S]*?)<\/LinkButton>/gu,
    (_match, href: string, label: string) => `[${label.trim()}](${href})`
  );

const badges = (body: string) =>
  body.replaceAll(
    /<Badge\b[^>]*\btext="(?<text>[^"]*)"[^>]*\/>/gu,
    (_match, text: string) => text
  );

const mdxComments = (body: string) =>
  body.replaceAll(/\{\/\*[\s\S]*?\*\/\}/gu, "");

const tidy = (body: string) =>
  body
    .replaceAll(/[ \t]+$/gmu, "")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

export interface ConvertedDocsPage {
  readonly body: string;
  readonly frontmatter: string;
  readonly problems: readonly string[];
  readonly routePath: string;
}

export const routePathOf = (file: string): string => {
  const relative = file.replace(/^.*?src\/content\/docs\//u, "");
  const withoutExtension = relative.replace(/\.mdx?$/u, "");

  if (withoutExtension === "index") {
    return "/";
  }

  return `/${withoutExtension.replace(/\/index$/u, "")}`;
};

export const convertDocsPage = (
  source: string,
  routePath = "/"
): ConvertedDocsPage => {
  const match = /^---\r?\n(?<frontmatter>[\s\S]*?)\r?\n---\r?\n?/u.exec(source);
  const frontmatterSource = match?.groups?.frontmatter ?? "";
  const rawBody = match === null ? source : source.slice(match[0].length);
  const parsed = decodeFrontmatter(frontmatterSource);
  const title = parsed.title ?? routePath;

  const frontmatter =
    parsed.description === undefined
      ? stringifyYaml({ title })
      : stringifyYaml({ title, description: parsed.description });

  const body = tidy(
    mdxComments(badges(linkButtons(stripModuleScope(rawBody))))
  );

  return {
    body,
    frontmatter,
    problems: checkDocsContent(`---\n${frontmatter}---\n\n${body}`),
    routePath,
  };
};

export const renderConvertedPage = (page: ConvertedDocsPage) =>
  `---\n${page.frontmatter}---\n\n${page.body}\n`;
