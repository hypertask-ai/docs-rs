export interface IndexToken {
  readonly divisor: number;
  readonly word: string;
}

const includeCharacters: ReadonlySet<string> = new Set(["_"]);

const letterOrNumber = /[\p{L}\p{N}]/u;

const isLetterOrNumber = (character: string): boolean =>
  letterOrNumber.test(character);

export const normalizeWord = (word: string): string => {
  let normalized = "";

  for (const character of word) {
    if (isLetterOrNumber(character) || includeCharacters.has(character)) {
      normalized += character.toLowerCase();
    }
  }

  return normalized;
};

const isCompoundCandidate = (word: string): boolean => {
  for (const character of word) {
    if (!isLetterOrNumber(character) && character !== "_") {
      return true;
    }
  }

  for (const character of word.slice(1)) {
    if (
      character === character.toUpperCase() &&
      character !== character.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
};

const discreteParts = (word: string): readonly string[] => {
  const parts: string[] = [];
  let current = "";

  for (const character of word) {
    if (!isLetterOrNumber(character)) {
      if (current !== "") {
        parts.push(current);
        current = "";
      }
    } else if (character !== character.toLowerCase() && current !== "") {
      parts.push(current);
      current = character.toLowerCase();
    } else {
      current += character.toLowerCase();
    }
  }

  if (current !== "") {
    parts.push(current);
  }

  return parts;
};

export const tokenizeWords = (text: string): readonly IndexToken[] =>
  text
    .split(/\s+/u)
    .filter((raw) => raw !== "" && isLetterOrNumber(raw))
    .flatMap((raw) => {
      const normalized = normalizeWord(raw);

      if (!isCompoundCandidate(raw)) {
        return normalized === "" ? [] : [{ divisor: 1, word: normalized }];
      }

      const parts = discreteParts(raw).filter((part) => part.length > 1);
      const divisor = parts.length === 0 ? 1 : 1 / (parts.length + 1);
      const words: IndexToken[] = [];

      if (normalized !== "") {
        words.push({ divisor, word: normalized });
      }

      for (const part of parts) {
        words.push({ divisor, word: part });
      }

      return words;
    });

export const wordCountOf = (text: string): number =>
  text.split(/\s+/u).filter((raw) => raw !== "" && isLetterOrNumber(raw))
    .length;

const isConsonant = (word: string, index: number): boolean => {
  const character = word.at(index) ?? "";

  if ("aeiou".includes(character)) {
    return false;
  }

  if (character === "y") {
    return index === 0 ? true : !isConsonant(word, index - 1);
  }

  return true;
};

const measure = (word: string): number => {
  let count = 0;
  let index = 0;

  while (index < word.length && isConsonant(word, index)) {
    index += 1;
  }

  while (index < word.length) {
    while (index < word.length && !isConsonant(word, index)) {
      index += 1;
    }

    if (index >= word.length) {
      break;
    }

    count += 1;

    while (index < word.length && isConsonant(word, index)) {
      index += 1;
    }
  }

  return count;
};

const hasVowel = (word: string): boolean => {
  for (let index = 0; index < word.length; index += 1) {
    if (!isConsonant(word, index)) {
      return true;
    }
  }

  return false;
};

const endsWithDoubleConsonant = (word: string): boolean =>
  word.length >= 2 &&
  word.at(-1) === word.at(-2) &&
  isConsonant(word, word.length - 1);

const endsWithConsonantVowelConsonant = (word: string): boolean => {
  const { length } = word;

  if (length < 3) {
    return false;
  }

  if (
    !isConsonant(word, length - 1) ||
    isConsonant(word, length - 2) ||
    !isConsonant(word, length - 3)
  ) {
    return false;
  }

  return !"wxy".includes(word.at(-1) ?? "");
};

const step2: readonly (readonly [string, string])[] = [
  ["ational", "ate"],
  ["tional", "tion"],
  ["enci", "ence"],
  ["anci", "ance"],
  ["izer", "ize"],
  ["bli", "ble"],
  ["alli", "al"],
  ["entli", "ent"],
  ["eli", "e"],
  ["ousli", "ous"],
  ["ization", "ize"],
  ["ation", "ate"],
  ["ator", "ate"],
  ["alism", "al"],
  ["iveness", "ive"],
  ["fulness", "ful"],
  ["ousness", "ous"],
  ["aliti", "al"],
  ["iviti", "ive"],
  ["biliti", "ble"],
  ["logi", "log"],
];

const step3: readonly (readonly [string, string])[] = [
  ["icate", "ic"],
  ["ative", ""],
  ["alize", "al"],
  ["iciti", "ic"],
  ["ical", "ic"],
  ["ful", ""],
  ["ness", ""],
];

const step4: readonly string[] = [
  "al",
  "ance",
  "ence",
  "er",
  "ic",
  "able",
  "ible",
  "ant",
  "ement",
  "ment",
  "ent",
  "ou",
  "ism",
  "ate",
  "iti",
  "ous",
  "ive",
  "ize",
];

const replaceSuffix = (
  word: string,
  suffix: string,
  replacement: string,
  minimum: number
): string => {
  const stem = word.slice(0, -suffix.length);

  return measure(stem) > minimum ? `${stem}${replacement}` : word;
};

const restoreEAfterVerb = (word: string): string => {
  if (word.endsWith("at") || word.endsWith("bl") || word.endsWith("iz")) {
    return `${word}e`;
  }

  if (endsWithDoubleConsonant(word) && !"lsz".includes(word.at(-1) ?? "")) {
    return word.slice(0, -1);
  }

  return measure(word) === 1 && endsWithConsonantVowelConsonant(word)
    ? `${word}e`
    : word;
};

const pluralStem = (word: string): string => {
  if (word.endsWith("sses")) {
    return `${word.slice(0, -4)}ss`;
  }

  if (word.endsWith("ies")) {
    return `${word.slice(0, -3)}i`;
  }

  return !word.endsWith("ss") && word.endsWith("s") ? word.slice(0, -1) : word;
};

const verbStem = (word: string): string => {
  if (word.endsWith("eed")) {
    return measure(word.slice(0, -3)) > 0 ? `${word.slice(0, -3)}ee` : word;
  }

  if (word.endsWith("ed") && hasVowel(word.slice(0, -2))) {
    return restoreEAfterVerb(word.slice(0, -2));
  }

  return word.endsWith("ing") && hasVowel(word.slice(0, -3))
    ? restoreEAfterVerb(word.slice(0, -3))
    : word;
};

const applySuffixes = (word: string): string => {
  for (const [suffix, replacement] of step2) {
    if (word.endsWith(suffix)) {
      return replaceSuffix(word, suffix, replacement, 0);
    }
  }

  for (const [suffix, replacement] of step3) {
    if (word.endsWith(suffix)) {
      return replaceSuffix(word, suffix, replacement, 0);
    }
  }

  for (const suffix of step4) {
    if (word.endsWith(suffix)) {
      return replaceSuffix(word, suffix, "", 1);
    }
  }

  return word;
};

const trimIon = (word: string): string =>
  word.endsWith("ion") &&
  measure(word.slice(0, -3)) > 1 &&
  /[st]$/u.test(word.slice(0, -3))
    ? word.slice(0, -3)
    : word;

const trimE = (word: string): string => {
  if (!word.endsWith("e")) {
    return word;
  }

  const stem = word.slice(0, -1);
  const count = measure(stem);

  return count > 1 || (count === 1 && !endsWithConsonantVowelConsonant(stem))
    ? stem
    : word;
};

const trimDoubleConsonant = (word: string): string =>
  measure(word) > 1 &&
  endsWithDoubleConsonant(word) &&
  !"lsz".includes(word.at(-1) ?? "")
    ? word.slice(0, -1)
    : word;

export const stemWord = (value: string): string => {
  if (value.length <= 2) {
    return value;
  }

  const plural = pluralStem(value);
  const verb = verbStem(plural);

  const yi =
    verb.endsWith("y") && hasVowel(verb.slice(0, -1))
      ? `${verb.slice(0, -1)}i`
      : verb;

  return trimDoubleConsonant(trimE(trimIon(applySuffixes(yi))));
};
