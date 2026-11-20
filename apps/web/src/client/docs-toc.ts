import { Option } from "effect";

import {
  DOCS_TOP_ANCHOR_ID,
  docsReadingLine,
} from "../features/docs-contents.js";
import { currentHeadingId } from "../features/docs-reading-position.js";
import type { DocsHeadingPosition } from "../features/docs-reading-position.js";

const tocRows = (): readonly HTMLAnchorElement[] => [
  ...document.querySelectorAll<HTMLAnchorElement>("#docs-toc a[href^='#']"),
];

const anchorId = (link: HTMLAnchorElement): string =>
  decodeURIComponent(link.hash.slice(1));

const headingPositions = (): readonly DocsHeadingPosition[] =>
  tocRows().flatMap((link) => {
    const id = anchorId(link);
    const heading = document.querySelector(`[id="${CSS.escape(id)}"]`);

    return heading === null
      ? []
      : [{ id, top: heading.getBoundingClientRect().top }];
  });

const headerHeight = (): number =>
  document.querySelector(".docs-header")?.getBoundingClientRect().height ?? 0;

const markCurrent = (current: string): void => {
  for (const link of tocRows()) {
    if (anchorId(link) === current) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  }
};

const syncCurrent = (): void => {
  markCurrent(
    Option.getOrElse(
      currentHeadingId(headingPositions(), docsReadingLine(headerHeight())),
      () => DOCS_TOP_ANCHOR_ID
    )
  );
};

export const bindDocsContents = (): void => {
  if (document.querySelector("#docs-toc") === null) {
    return;
  }

  let frame = 0;

  const schedule = (): void => {
    if (frame !== 0) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncCurrent();
    });
  };

  syncCurrent();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
};
