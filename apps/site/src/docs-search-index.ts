import type {
  DocsSearchIndexData,
  DocsSearchPageData,
} from "./docs-search-data.ts";
import { stemWord, tokenizeWords, wordCountOf } from "./docs-search-tokens.ts";

export interface DocsPageSource {
  readonly bodyMarkdown: string;
  readonly routePath: string;
  readonly title: string;
}

const headingWeights: ReadonlyMap<number, number> = new Map([
  [1, 7],
  [2, 6],
  [3, 5],
  [4, 4],
  [5, 3],
  [6, 2],
]);

const headingPattern = /^(?<hashes>#{1,6})\s+(?<text>.*)$/u;

const fencePattern = /^\s*(?:```|~~~)/u;

const modulePattern = /^(?:import|export)\s/u;

const tidy = (line: string): string =>
  line
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, " ")
    .replaceAll(/\[(?<label>[^\]]*)\]\([^)]*\)/gu, "$<label>")
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/\{[^}]*\}/gu, " ")
    .replaceAll(/[`*_|>~#]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();

const anchorOf = (title: string): string =>
  title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

interface BodySection {
  readonly level: number;
  readonly lines: string[];
  readonly title: string;
}

const readSections = (body: string): readonly BodySection[] => {
  const sections: BodySection[] = [];
  let current: BodySection = { level: 1, lines: [], title: "" };
  let inFence = false;

  for (const raw of body.split("\n")) {
    if (fencePattern.test(raw)) {
      inFence = !inFence;

      if (!inFence) {
        current.lines.push(raw.replaceAll(/[`~]+/gu, " "));
      }

      continue;
    }

    const heading = inFence ? null : headingPattern.exec(raw);

    if (heading !== null) {
      sections.push(current);
      current = {
        level: heading.groups?.hashes?.length ?? 1,
        lines: [],
        title: tidy(heading.groups?.text ?? ""),
      };

      continue;
    }

    if (!inFence && modulePattern.test(raw)) {
      continue;
    }

    current.lines.push(tidy(raw));
  }

  sections.push(current);

  return sections.filter(
    (section) => section.title !== "" || section.lines.join("").trim() !== ""
  );
};

const termsOf = (text: string, weight: number): ReadonlyMap<string, number> => {
  const terms = new Map<string, number>();

  for (const token of tokenizeWords(text)) {
    const stem = stemWord(token.word);
    terms.set(stem, (terms.get(stem) ?? 0) + weight * token.divisor);
  }

  return terms;
};

const mergeTerms = (
  target: Map<string, number>,
  source: ReadonlyMap<string, number>
): void => {
  for (const [stem, weight] of source) {
    target.set(stem, (target.get(stem) ?? 0) + weight);
  }
};

export const buildDocsSearchPage = (
  source: DocsPageSource
): DocsSearchPageData => {
  const terms = new Map<string, number>();
  let wordCount = wordCountOf(source.title);
  mergeTerms(terms, termsOf(source.title, 7));

  const sections: {
    anchor: string;
    text: string;
    title: string;
  }[] = [];

  const bodyTexts: string[] = [];

  for (const section of readSections(source.bodyMarkdown)) {
    const weight = headingWeights.get(section.level) ?? 1;
    const text = section.lines.join(" ").replaceAll(/\s+/gu, " ").trim();

    if (section.title !== "") {
      wordCount += wordCountOf(section.title);
      mergeTerms(terms, termsOf(section.title, weight));
    }

    if (text !== "") {
      wordCount += wordCountOf(text);
      mergeTerms(terms, termsOf(text, 1));
    }

    bodyTexts.push(section.title, text);
    sections.push({
      anchor: anchorOf(section.title),
      text,
      title: section.title,
    });
  }

  return {
    body: [source.title, ...bodyTexts].filter((part) => part !== "").join(" "),
    routePath: source.routePath,
    sections,
    terms: Object.fromEntries(terms),
    title: source.title,
    titleTerms: [
      ...new Set(
        tokenizeWords(source.title).map((token) => stemWord(token.word))
      ),
    ],
    wordCount,
  };
};

export const buildDocsSearchIndex = (
  sources: readonly DocsPageSource[]
): DocsSearchIndexData => {
  const pages = sources
    .map((source) => buildDocsSearchPage(source))
    .toSorted((left, right) => left.routePath.localeCompare(right.routePath));

  const total = pages.reduce((count, page) => count + page.wordCount, 0);

  return {
    averagePageLength: pages.length === 0 ? 0 : total / pages.length,
    pageCount: pages.length,
    pages,
    version: 1,
  };
};
