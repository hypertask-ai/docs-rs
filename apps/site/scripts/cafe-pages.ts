import {
  cafeDomain,
  cafeLetterInitial,
  githubProfileUrl,
  selectCafeNews,
  sortCafeProjects,
  verifiedLetters,
  xProfileUrl,
} from "@hypertask-docs/core/contracts";
import type {
  CafeAuthor,
  CafeDataValue,
  CafeNewsItemValue,
  CafePeopleList,
  CafePersonSummary,
  CafeProjectValue,
} from "@hypertask-docs/core/contracts";

import {
  allStarsCopy,
  allStarsTools,
  cafeSubmissionPrompt,
  directoryCopy,
  handleLabels,
  letterNames,
  newsCopy,
  newsKindLabels,
  sortRules,
  sortRulesLead,
  sortSignals,
  sortSignalsLead,
  removalLine,
  sortSources,
  threadCounts,
} from "../../web/src/features/cafe/copy.ts";
import { cafeSubmissionGuide } from "../src/agent-guide.ts";

const pageLimit = 100;

const submissionSource = [
  "<HumanOnly>",
  cafeSubmissionPrompt,
  "</HumanOnly>",
  "",
  "<AgentOnly>",
  cafeSubmissionGuide("https://ratstack.sh"),
  "</AgentOnly>",
].join("\n\n");

const linkText = (value: string) => value.replaceAll(/[[\]]/gu, "");

const authorMarkdown = (author: typeof CafeAuthor.Type, fallback: string) => {
  if (author.github !== null) {
    return `[${linkText(author.github)}](${githubProfileUrl(author.github)})`;
  }

  if (author.x !== null) {
    return `[@${author.x}](${xProfileUrl(author.x)})`;
  }

  return fallback;
};

const threadMarkdown = (item: CafeNewsItemValue) =>
  item.kind === "thread"
    ? [
        `   ${threadCounts(item.engagement.replies, item.engagement.participants)}`,
        ...item.topReplies
          .slice(0, 3)
          .map(
            (reply) =>
              `   - [@${reply.x}](${xProfileUrl(reply.x)}): ${reply.text.replaceAll("\n", " ")} ([${reply.likes} likes](${reply.url}))`
          ),
      ]
    : [];

const newsItemMarkdown = (item: CafeNewsItemValue, index: number) =>
  [
    `${index + 1}. [${newsKindLabels[item.kind]}] [${linkText(item.title)}](${item.url}) (${cafeDomain(item.url)})`,
    ...(item.summary === null ? [] : [`   ${item.summary}`]),
    `   ${item.date} by ${authorMarkdown(item.author, cafeDomain(item.url))}`,
    ...threadMarkdown(item),
  ].join("\n");

export const cafeNewsMarkdown = (data: CafeDataValue) => {
  const list = selectCafeNews(data, { limit: pageLimit, sort: "rank" });

  return [
    `# ${newsCopy.heading}`,
    "",
    newsCopy.intro,
    "",
    `[${newsCopy.feedLabel}](/news.xml)`,
    "",
    list.items
      .map((entry, index) => newsItemMarkdown(entry.item, index))
      .join("\n\n"),
    "",
    `## ${newsCopy.sortHeading}`,
    "",
    sortSignalsLead,
    "",
    ...sortSignals.map((signal) => `- ${signal}`),
    "",
    sortRulesLead,
    "",
    ...sortRules.map((rule) => `- ${rule}`),
    "",
    `Prior art: ${sortSources.map((source) => `[${source.label}](${source.href})`).join(", ")}.`,
    "",
    submissionSource,
  ].join("\n");
};

const projectMarkdown = (project: CafeProjectValue) =>
  [
    `- [${linkText(project.title)}](${project.url}) ${verifiedLetters(project)
      .map((letter) => `\`${cafeLetterInitial[letter]}\``)
      .join(" ")}`,
    `  ${project.summary}`,
    `  by ${authorMarkdown(project.author, cafeDomain(project.url))} · updated ${project.date}${project.stars === null ? "" : ` · ${project.stars} stars`}`,
    ...verifiedLetters(project).map(
      (letter) => `  - ${letterNames[letter]}: ${project.stack[letter] ?? ""}`
    ),
  ].join("\n");

export const cafeDirectoryMarkdown = (data: CafeDataValue) =>
  [
    `# ${directoryCopy.heading}`,
    "",
    directoryCopy.intro,
    "",
    sortCafeProjects(data.projects, "updated").map(projectMarkdown).join("\n"),
    "",
    submissionSource,
  ].join("\n");

const sourced = (fact: {
  readonly source: string;
  readonly verified: string;
}) => `([source](${fact.source}), checked ${fact.verified})`;

const summaryLine = (person: typeof CafePersonSummary.Type) =>
  [
    `- ${linkText(person.name)} \`${person.id}\`: ${person.summary.text} ${sourced(person.summary)}`,
    `  Links: ${person.handles.map((handle) => `[${handleLabels[handle.kind]}](${handle.url})`).join(", ")}`,
    ...(person.repos.length === 0
      ? []
      : [
          `  Built: ${person.repos.map((repo) => `[${repo.repo}](${repo.source}) (${repo.stars} stars, checked ${repo.verified})`).join(", ")}`,
        ]),
  ].join("\n");

export const allStarsIndexMarkdown = (list: typeof CafePeopleList.Type) => {
  const section = (heading: string, kind: "person" | "channel") => {
    const entries = list.people.filter((person) => person.kind === kind);

    return entries.length === 0
      ? []
      : [`## ${heading}`, "", ...entries.map(summaryLine), ""];
  };

  return [
    `# ${allStarsCopy.heading}`,
    "",
    allStarsCopy.intro,
    "",
    allStarsCopy.entryRule,
    "",
    `${allStarsTools} [${allStarsCopy.feedLabel}](/all-stars.xml).`,
    "",
    ...section(allStarsCopy.peopleHeading, "person"),
    ...section(allStarsCopy.channelsHeading, "channel"),
    removalLine(null),
  ].join("\n");
};
