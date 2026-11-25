export interface DocsSearchExcerptPart {
  readonly marked: boolean;
  readonly text: string;
}

const queryTerms = (query: string): readonly string[] =>
  query
    .toLowerCase()
    .split(/\s+/u)
    .filter((term) => term !== "");

export const docsSearchExcerptParts = (
  excerpt: string,
  query: string
): readonly DocsSearchExcerptPart[] => {
  const terms = queryTerms(query);

  if (terms.length === 0) {
    return [{ marked: false, text: excerpt }];
  }

  const parts: DocsSearchExcerptPart[] = [];

  for (const word of excerpt.split(/(?<gap>\s+)/u)) {
    if (word === "") {
      continue;
    }

    const marked =
      !/^\s+$/u.test(word) &&
      terms.some((term) => word.toLowerCase().includes(term));

    const previous = parts.at(-1);

    if (previous !== undefined && previous.marked === marked) {
      parts[parts.length - 1] = {
        marked,
        text: `${previous.text}${word}`,
      };

      continue;
    }

    parts.push({ marked, text: word });
  }

  return parts;
};
