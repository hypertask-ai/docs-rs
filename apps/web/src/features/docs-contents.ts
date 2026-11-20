export const DOCS_TOP_ANCHOR_ID = "_top";

const readingLineGap = 32;

const readingBandHeight = 53;

export const docsReadingLine = (headerHeight: number): number =>
  headerHeight + readingLineGap + readingBandHeight;
