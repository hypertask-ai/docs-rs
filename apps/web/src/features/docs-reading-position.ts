import { Option } from "effect";

export interface DocsHeadingPosition {
  readonly id: string;
  readonly top: number;
}

export const currentHeadingId = (
  headings: readonly DocsHeadingPosition[],
  threshold: number
): Option.Option<string> => {
  const above = headings.filter((heading) => heading.top <= threshold);
  const last = above.at(-1);

  return last === undefined ? Option.none() : Option.some(last.id);
};
