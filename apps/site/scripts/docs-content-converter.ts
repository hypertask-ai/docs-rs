import { Schema } from "effect";
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

  for (const match of line.matchAll(/<Aside\b[^>]*\btype="([^"]*)"/gu)) {
    if (!asideTypes.has(match[1] ?? "")) {
      problems.push(
        `${number}: <Aside type="${match[1]}"> is not valid; use note, tip, caution or danger`
      );
    }
  }

  for (const match of line.matchAll(/<([A-Z]\w*)[\s/>]/gu)) {
    const name = match[1] ?? "";

    if (!knownTag(name)) {
      problems.push(
        `${number}: <${name}> has no reader component; register it or remove it`
      );
    }
  }

  return problems;
};

const placeholderProblems = (line: string, number: number): readonly string[] =>
  Array.from(line.matchAll(/(?<![\\=])\{([^{}]*)\}/gu)).flatMap((match) => {
    const body = (match[1] ?? "").trim();

    if (body === "" || body.startsWith("/*")) {
      return [];
    }

    const head = /^[A-Za-z_$][\w$]*/u.exec(body)?.[0];
    const looksLikeCode =
      head !== undefined &&
      knownTag(head) === false &&
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

  lines.forEach((raw, index) => {
    const number = index + 1;

    if (inFrontmatter) {
      if (index > 0 && raw.trim() === "---") {
        inFrontmatter = false;
      }

      return;
    }

    if (/^\s*(?:```|~~~)/u.test(raw)) {
      inFence = !inFence;

      return;
    }

    if (inFence) {
      return;
    }

    if (/^(?:import|export)\s/u.test(raw)) {
      problems.push(
        `${number}: ${raw.split(" ")[0]} belongs to MDX; the reader has no module scope`
      );

      return;
    }

    const line = maskInlineCode(raw);

    problems.push(...lineProblems(line, number));
    problems.push(...placeholderProblems(line, number));
  });

  return problems;
};

const frontmatterRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  Schema.decodeUnknownSync(Schema.Record(Schema.String, Schema.Unknown))(
    value ?? {}
  );

const stringField = (
  record: Readonly<Record<string, unknown>>,
  name: string
): string | undefined => {
  const value = record[name];

  return typeof value === "string" ? value : undefined;
};

const stripModuleScope = (body: string) =>
  body
    .split("\n")
    .filter((line) => !/^(?:import|export)\s/u.test(line))
    .join("\n");

const linkButtons = (body: string) =>
  body.replaceAll(
    /<LinkButton\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/LinkButton>/gu,
    (_match, href: string, label: string) => `[${label.trim()}](${href})`
  );

const badges = (body: string) =>
  body.replaceAll(
    /<Badge\b[^>]*\btext="([^"]*)"[^>]*\/>/gu,
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
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u.exec(source);
  const rawFrontmatter = match?.[1] ?? "";
  const rawBody = match === null ? source : source.slice(match[0].length);
  const parsed = frontmatterRecord(
    rawFrontmatter.trim() === "" ? {} : parseYaml(rawFrontmatter)
  );

  const frontmatter = stringifyYaml({
    title: stringField(parsed, "title") ?? routePath,
    ...(stringField(parsed, "description") === undefined
      ? {}
      : { description: stringField(parsed, "description") }),
  });

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
