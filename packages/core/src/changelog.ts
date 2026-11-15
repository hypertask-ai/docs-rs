import { defineContract } from "@rat-stack/capability/contract";
import { Schema } from "effect";
import * as HttpApiSchema from "effect/http-api/HttpApiSchema";

import { AssetReadError } from "./asset-read-error.js";

export const CHANGELOG_ORIGIN = "https://docs.hypertask.ai";

export const CHANGELOG_TITLE = "Hypertask Changelog";

export const CHANGELOG_DESCRIPTION =
  "New features, improvements, and fixes in Hypertask.";

export const legacyChangelogPaths = [
  "src/content/docs/changelog/index.mdx",
  "src/content/docs/changelog/index",
  "changelog/index.mdx",
  "CHANGELOG.md",
  "docs/changelog/index.mdx",
  "docs/changelog/test.mdx",
  "hypertask/docs/changelog/index.mdx",
  "try-edit.md",
];

const ChangelogDate = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u)
);

export const ChangelogEntry = Schema.Struct({
  body: Schema.String,
  date: ChangelogDate,
  html: Schema.optional(Schema.String),
  id: Schema.String,
  summary: Schema.String,
  tags: Schema.Array(Schema.String),
  title: Schema.String,
});

export type ChangelogEntryValue = typeof ChangelogEntry.Type;

export const ChangelogFrontmatter = Schema.Struct({
  date: ChangelogDate,
  summary: Schema.String,
  tags: Schema.Array(Schema.String),
  title: Schema.String,
});

const changelogUrl = (id: string) => `${CHANGELOG_ORIGIN}/changelog/${id}/`;

const changelogDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

const plainAnnouncementEntities: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const decodeAnnouncementEntities = (text: string) =>
  text.replaceAll(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu,
    (_, entity: string) =>
      entity.startsWith("#")
        ? String.fromCodePoint(
            entity[1]?.toLowerCase() === "x"
              ? Number.parseInt(entity.slice(2), 16)
              : Number(entity.slice(1))
          )
        : (plainAnnouncementEntities[entity.toLowerCase()] ?? entity)
  );

export const plainAnnouncement = (text: string) =>
  decodeAnnouncementEntities(
    text
      .replaceAll(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
      .replaceAll(/<\/?(?:p|strong|li|ul|code|kbd|em|a)\b[^>]*>/gu, "")
      .replaceAll(/\*\*([^*]+)\*\*/gu, "$1")
      .replaceAll("`", "")
  )
    .replaceAll(String.fromCodePoint(0x2014), " - ")
    .replaceAll("â\\x80\\x94", " - ")
    .replaceAll(/\\+(['"])/gu, "$1")
    .replaceAll(/\s+/gu, " ")
    .trim();

export const announcementKeys = (date: string, text: string) => {
  const day = changelogDate(date).toISOString().slice(0, 10);
  const plain = plainAnnouncement(text);
  const tickets = [
    ...plain.matchAll(
      /HTPR-(\d+)|https:\/\/app\.hypertask\.ai\/detail\/project-15\/(\d+)/giu
    ),
  ].map((match) => match[1] ?? match[2] ?? "");
  const ticketKey = [...new Set(tickets)].sort().join(",");

  return [
    `${day}|text|${plain.toLowerCase()}`,
    ...(ticketKey === "" ? [] : [`${day}|tickets|${ticketKey}`]),
  ];
};

const shortText = (text: string, limit: number) =>
  text.length <= limit
    ? text
    : `${text
        .slice(0, limit - 3)
        .replace(/\s+\S*$/u, "")
        .trimEnd()}...`;

const areaTags = (text: string) => {
  const areas = [
    ["AI", /\bai\b|agent|chat|dictation/iu],
    ["Board", /board|kanban|column/iu],
    ["Tasks", /task|ticket|comment/iu],
    ["Search", /search/iu],
    ["Mobile", /mobile|phone|keyboard/iu],
    ["CLI", /\bcli\b|command.line/iu],
    ["MCP", /\bmcp\b/iu],
    ["API", /\bapi\b/iu],
    ["Inbox", /inbox|notification|remind/iu],
    ["Settings", /setting|flag/iu],
  ] as const;
  const tags = areas
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag);

  return tags.length === 0 ? ["Hypertask"] : tags;
};

const htmlEscapes: ReadonlyMap<string, string> = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

const escapeHtml = (text: string) =>
  text.replaceAll(
    /[&<>"']/gu,
    (character) => htmlEscapes.get(character) ?? character
  );

export interface LegacyChangelogEntry {
  readonly body: string;
  readonly date: string;
  readonly html: string;
  readonly id: string;
  readonly keys: readonly string[];
  readonly summary: string;
  readonly tags: readonly string[];
  readonly title: string;
}

export const parseLegacyChangelog = (
  raw: string,
  source: string,
  digest: (text: string) => string
): readonly LegacyChangelogEntry[] => {
  const normalized = raw
    .replaceAll(/<Update\s+label=["']([^"']+)["'][^>]*>/gu, "\n## $1\n")
    .replaceAll("</Update>", "\n")
    .replaceAll(/\\+n/gu, "\n");
  const headings = [...normalized.matchAll(/^## (\w+ \d+, \d{4})\s*$/gmu)];

  return headings.flatMap((heading, index) => {
    const label = heading[1] ?? "";
    const date = new Date(`${label} UTC`);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date in ${source}: ${label}`);
    }

    const day = date.toISOString().slice(0, 10);
    const start = (heading.index ?? 0) + heading[0].length;
    const block = normalized.slice(
      start,
      headings[index + 1]?.index ?? normalized.length
    );
    const items: string[] = [];

    for (const line of block.split("\n")) {
      const trimmed = line.trim();

      if (
        /^[*-] |^<(?:p|li)>|^(?:Added|Fixed|Improved|Changed|Removed|New):/iu.test(
          trimmed
        )
      ) {
        if (!trimmed.includes("following tickets this run")) {
          items.push(trimmed.replace(/^[*-] /u, ""));
        }
      } else if (/^\s+\S/u.test(line) && !trimmed.startsWith("<")) {
        const previous = items.pop();

        if (previous !== undefined) {
          items.push(`${previous} ${trimmed}`);
        }
      }
    }

    return items.map((item) => {
      const text = plainAnnouncement(item);
      const urls = [
        ...new Set([
          ...(item.match(
            /https:\/\/app\.hypertask\.ai\/detail\/project-15\/\d+/gu
          ) ?? []),
          ...[...text.matchAll(/HTPR-(\d+)/giu)].map(
            (match) =>
              `https://app.hypertask.ai/detail/project-15/${match[1] ?? ""}`
          ),
        ]),
      ];
      const description = text
        .replaceAll(/\s*\(?HTPR-\d+\)?/giu, "")
        .replaceAll(
          /\s*\(?https:\/\/app\.hypertask\.ai\/detail\/project-15\/\d+\)?/gu,
          ""
        )
        .trim();
      const title = shortText(
        description.replace(
          /^(?:Added|Fixed|Improved|Changed|Removed|New):\s*/iu,
          ""
        ),
        90
      );
      const sentences = [
        ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(
          description
        ),
      ].slice(0, 2);
      const summary = shortText(
        sentences
          .map((sentence) => sentence.segment)
          .join("")
          .trim(),
        350
      );
      const slug = title
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/gu, "-")
        .replaceAll(/^-|-$/gu, "");
      const id = `${day}-${slug}-${digest(text).slice(0, 10)}`;
      const links = urls
        .map((url) => `<li><a href="${url}">${url}</a></li>`)
        .join("");
      const related = urls.map((url) => `- [${url}](${url})`).join("\n");

      return {
        body: `${summary}\n\n## Details\n\n${text}\n\n## Related tickets\n\n${related}`,
        date: day,
        html: `<p>${escapeHtml(summary)}</p><h2>Details</h2><p>${escapeHtml(text)}</p>${links === "" ? "" : `<h2>Related tickets</h2><ul>${links}</ul>`}`,
        id,
        keys: announcementKeys(day, text),
        summary,
        tags: areaTags(description),
        title,
      };
    });
  });
};

export const sortChangelog = (
  entries: readonly ChangelogEntryValue[]
): readonly ChangelogEntryValue[] =>
  [...entries].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || left.id.localeCompare(right.id)
  );

export const changelogJsonText = (entries: readonly ChangelogEntryValue[]) =>
  JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: CHANGELOG_TITLE,
      description: CHANGELOG_DESCRIPTION,
      home_page_url: `${CHANGELOG_ORIGIN}/changelog/`,
      feed_url: `${CHANGELOG_ORIGIN}/changelog.json`,
      language: "en",
      items: sortChangelog(entries).map((entry) => ({
        id: changelogUrl(entry.id),
        title: entry.title,
        content_text: entry.body,
        summary: entry.summary,
        tags: entry.tags,
        date_published: changelogDate(entry.date).toISOString(),
        url: changelogUrl(entry.id),
      })),
    },
    null,
    2
  );

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

export const changelogMarkdownText = (
  entries: readonly ChangelogEntryValue[]
) =>
  [
    "# Changelog",
    ...sortChangelog(entries).map(
      (entry) =>
        `## ${entry.title}\n\n${longDate.format(changelogDate(entry.date))} | ${entry.tags.join(", ")}\n\n${entry.summary}\n\n[Read more](${changelogUrl(entry.id)})`
    ),
  ].join("\n\n") + "\n";

const xmlEscapes: ReadonlyMap<string, string> = new Map([
  ['"', "&quot;"],
  ["&", "&amp;"],
  ["'", "&apos;"],
  ["<", "&lt;"],
  [">", "&gt;"],
]);

const xmlText = (value: string) =>
  value.replaceAll(
    /["&'<>]/gu,
    (character) => xmlEscapes.get(character) ?? character
  );

const rssItem = (entry: ChangelogEntryValue) => {
  const link = changelogUrl(entry.id);

  return [
    "<item>",
    `<title>${xmlText(entry.title)}</title>`,
    `<link>${xmlText(link)}</link>`,
    `<guid isPermaLink="true">${xmlText(link)}</guid>`,
    `<description>${xmlText(entry.summary)}</description>`,
    `<pubDate>${changelogDate(entry.date).toUTCString()}</pubDate>`,
    ...entry.tags.map((tag) => `<category>${xmlText(tag)}</category>`),
    "</item>",
  ].join("");
};

export const changelogRssText = (entries: readonly ChangelogEntryValue[]) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${xmlText(CHANGELOG_TITLE)}</title>`,
    `<description>${xmlText(CHANGELOG_DESCRIPTION)}</description>`,
    `<link>${CHANGELOG_ORIGIN}/</link>`,
    "<language>en-us</language>",
    ...sortChangelog(entries).map(rssItem),
    "</channel>",
    "</rss>",
  ].join("");

const titleLimit = 90;

const summaryLimit = 350;

export interface ChangelogFormatViolation {
  readonly file: string;
  readonly fix: string;
  readonly what: string;
  readonly why: string;
}

export interface ChangelogSource {
  readonly body: string;
  readonly date: string;
  readonly file: string;
  readonly raw: string;
  readonly summary: string;
  readonly title: string;
  readonly tags: readonly string[];
}

const formatViolations = (
  source: ChangelogSource
): readonly ChangelogFormatViolation[] => {
  const { body, date, file, raw, summary, tags, title } = source;
  const violations: ChangelogFormatViolation[] = [];

  if (!file.slice(file.lastIndexOf("/") + 1).startsWith(date)) {
    violations.push({
      file,
      fix: `rename \`${file}\` so its name starts with the frontmatter date.`,
      what: "The changelog file name does not start with its date.",
      why: "Entry addresses and the newest-first order read the date from the file name.",
    });
  }

  if (
    title.length === 0 ||
    title.length > 90 ||
    /[<>]|HTPR-\d+/iu.test(title)
  ) {
    violations.push({
      file,
      fix: `shorten \`title\` in \`${file}\` to plain words under 90 characters.`,
      what: "The changelog title is empty, longer than 90 characters, or carries markup or a ticket number.",
      why: "Titles are plain feed text, and a long one is cut mid word for readers.",
    });
  }

  if (tags.length === 0 || tags.some((tag) => tag.trim() === "")) {
    violations.push({
      file,
      fix: `add one or more plain \`tags\` to \`${file}\`.`,
      what: "The changelog entry has no usable area tags.",
      why: "The JSON and RSS feeds group entries by these tags.",
    });
  }

  if (
    summary.length === 0 ||
    summary.length > summaryLimit ||
    /[<\n]/u.test(summary)
  ) {
    violations.push({
      file,
      fix: `trim \`summary\` in \`${file}\` to plain words under 350 characters.`,
      what: "The changelog summary is missing, longer than 350 characters, or carries markup or a line break.",
      why: "The feeds show the summary alone, so a broken one reaches every reader.",
    });
  }

  if (body.trim().length <= summary.length) {
    violations.push({
      file,
      fix: `add the explanation under \`## Details\` in \`${file}\`.`,
      what: "The changelog body is no longer than its summary.",
      why: "The entry page would repeat the summary with nothing more behind it.",
    });
  }

  if (raw.includes(String.fromCodePoint(0x2014))) {
    violations.push({
      file,
      fix: `replace the long dash in \`${file}\` with a hyphen.`,
      what: "The changelog entry contains a long dash.",
      why: "Old writers strip long dashes, so a new one signals text that skipped the format.",
    });
  }

  return violations;
};

export const changelogFormatViolations = (
  sources: readonly ChangelogSource[]
): readonly ChangelogFormatViolation[] => sources.flatMap(formatViolations);

const feedSuccess = (contentType: string) =>
  Schema.String.pipe(HttpApiSchema.asText({ contentType }));

export const changelogJsonFeedContract = defineContract("changelogJsonFeed", {
  annotations: { idempotent: true, readOnly: true },
  description: "The changelog as a JSON Feed 1.1 document",
  failure: AssetReadError,
  http: { method: "GET", path: "/changelog.json" },
  input: Schema.Struct({}),
  output: feedSuccess("application/json"),
});

export const changelogMarkdownFeedContract = defineContract(
  "changelogMarkdownFeed",
  {
    annotations: { idempotent: true, readOnly: true },
    description: "The changelog as one markdown document",
    failure: AssetReadError,
    http: { method: "GET", path: "/changelog.md" },
    input: Schema.Struct({}),
    output: feedSuccess("text/markdown; charset=utf-8"),
  }
);

export const changelogRssFeedContract = defineContract("changelogRssFeed", {
  annotations: { idempotent: true, readOnly: true },
  description: "The changelog as an RSS 2.0 feed",
  failure: AssetReadError,
  http: { method: "GET", path: "/changelog.xml" },
  input: Schema.Struct({}),
  output: feedSuccess("application/xml"),
});

export const changelogFeedContracts = [
  changelogJsonFeedContract,
  changelogMarkdownFeedContract,
  changelogRssFeedContract,
] as const;
