import type {
  DocsSearchIndexData,
  DocsSearchPageData,
} from "./docs-search-data.js";
import { stemWord } from "./docs-search-tokens.js";

export interface DocsSearchHit {
  readonly excerpt: string;
  readonly routePath: string;
  readonly sections: readonly {
    readonly anchor: string;
    readonly excerpt: string;
    readonly title: string;
  }[];
  readonly title: string;
}

export interface DocsSearchResults {
  readonly matches: readonly DocsSearchHit[];
  readonly total: number;
}

const metaTitleWeight = 5;

const pageLengthWeight = 0.1;

const termFrequencyWeight = 0.1;

const termSaturationWeight = 2;

const termSimilarityWeight = 9;

const lengthBonus = (differential: number): number =>
  Math.exp(
    Math.exp((-0.5 * differential * differential) / 4) * termSimilarityWeight
  ) / Math.exp(termSimilarityWeight);

const inverseDocumentFrequency = (total: number, containing: number): number =>
  Math.log((total - containing + 0.5) / (containing + 0.5) + 1);

const extensionWordsOf = (
  stems: readonly string[],
  term: string
): readonly string[] => {
  const extensions = stems.filter((stem) => stem.startsWith(term));

  if (extensions.length > 0) {
    return extensions;
  }

  const [prefix] = stems
    .filter((stem) => term.startsWith(stem))
    .toSorted((left, right) => right.length - left.length);

  return prefix === undefined ? [] : [prefix];
};

interface TermPlan {
  readonly extensions: readonly string[];
  readonly pages: ReadonlySet<string>;
  readonly term: string;
}

const termPlanOf = (
  pages: readonly DocsSearchPageData[],
  stems: readonly string[],
  term: string
): TermPlan => {
  const extensions = extensionWordsOf(stems, term);

  const matching = pages.filter((page) =>
    extensions.some(
      (extension) =>
        page.terms[extension] !== undefined ||
        page.titleTerms.includes(extension)
    )
  );

  return {
    extensions,
    pages: new Set(matching.map((page) => page.routePath)),
    term,
  };
};

interface ScoredPage {
  readonly page: DocsSearchPageData;
  readonly score: number;
}

const scoreOf = (
  index: DocsSearchIndexData,
  plans: readonly TermPlan[],
  queryIdf: number,
  page: DocsSearchPageData
): number => {
  let score = 0;

  for (const plan of plans) {
    const matches = plan.extensions.filter(
      (extension) =>
        page.terms[extension] !== undefined ||
        page.titleTerms.includes(extension)
    );

    if (matches.length === 0) {
      return 0;
    }

    const termIdf = inverseDocumentFrequency(index.pageCount, plan.pages.size);

    for (const extension of plan.extensions) {
      const weighted = page.terms[extension];

      if (weighted === undefined) {
        continue;
      }

      const bonus = lengthBonus(
        Math.abs(extension.length - plan.term.length) + 1
      );

      const weightedFrequency = weighted * bonus;
      const saturation = termSaturationWeight;

      const bm25 =
        ((saturation + 1) * weightedFrequency) /
        (saturation *
          (1 -
            pageLengthWeight +
            pageLengthWeight *
              (page.wordCount /
                (index.averagePageLength === 0
                  ? 1
                  : index.averagePageLength))) +
          weightedFrequency);

      const raw = Math.min(
        weightedFrequency /
          (index.averagePageLength === 0 ? 1 : index.averagePageLength / 5),
        saturation + 1
      );

      const frequency =
        (1 - termFrequencyWeight) * raw + termFrequencyWeight * bm25;

      score += termIdf * frequency;
    }

    const titleMatches = matches.filter((extension) =>
      page.titleTerms.includes(extension)
    );

    if (titleMatches.length > 0) {
      const matchedIdf = titleMatches.length * termIdf;
      const coverage = queryIdf === 0 ? 0 : matchedIdf / queryIdf;

      score += metaTitleWeight * matchedIdf * coverage * coverage;
    }
  }

  return score;
};

const excerptWindow = 20;

const wordPattern = /[\p{L}\p{N}_]+/u;

const matchedWordIndex = (
  words: readonly string[],
  extensions: readonly string[]
): number =>
  words.findIndex((word) => {
    const stem = wordPattern.exec(word.toLowerCase())?.[0];

    return stem !== undefined && extensions.includes(stemWord(stem));
  });

const excerptAround = (text: string, extensions: readonly string[]): string => {
  const words = text.split(/\s+/u).filter((word) => word !== "");
  const index = matchedWordIndex(words, extensions);

  if (index === -1) {
    return words.slice(0, excerptWindow).join(" ");
  }

  return words
    .slice(
      Math.max(0, index - excerptWindow),
      Math.min(words.length, index + excerptWindow)
    )
    .join(" ");
};

const hitOf = (
  page: DocsSearchPageData,
  extensions: readonly string[]
): DocsSearchHit => ({
  excerpt: excerptAround(page.body, extensions),
  routePath: page.routePath,
  sections: page.sections
    .filter(
      (section) =>
        section.text !== "" &&
        matchedWordIndex(
          section.text.split(/\s+/u).filter((word) => word !== ""),
          extensions
        ) !== -1
    )
    .map((section) => ({
      anchor: section.anchor,
      excerpt: excerptAround(section.text, extensions),
      title: section.title,
    })),
  title: page.title,
});

export const searchDocsIndex = (
  index: DocsSearchIndexData,
  query: string,
  requestedLimit = 5
): DocsSearchResults => {
  const limit = Math.max(1, Math.min(20, Math.trunc(requestedLimit)));

  const terms = query
    .toLowerCase()
    .trim()
    .split(" ")
    .filter((term) => term !== "")
    .map((term) => stemWord(term));

  if (terms.length === 0 || index.pages.length === 0) {
    return { matches: [], total: 0 };
  }

  const stems = [
    ...new Set(index.pages.flatMap((page) => Object.keys(page.terms))),
  ].toSorted();

  const plans = terms.map((term) => termPlanOf(index.pages, stems, term));

  if (plans.some((plan) => plan.extensions.length === 0)) {
    return { matches: [], total: 0 };
  }

  const queryIdf = plans.reduce(
    (total, plan) =>
      total + inverseDocumentFrequency(index.pageCount, plan.pages.size),
    0
  );

  const scored: ScoredPage[] = [];

  for (const page of index.pages) {
    const score = scoreOf(index, plans, queryIdf, page);

    if (score > 0) {
      scored.push({ page, score });
    }
  }

  const ordered = scored.toSorted((left, right) => right.score - left.score);
  const extensions = [...new Set(plans.flatMap((plan) => plan.extensions))];

  return {
    matches: ordered.slice(0, limit).map(({ page }) => hitOf(page, extensions)),
    total: ordered.length,
  };
};
