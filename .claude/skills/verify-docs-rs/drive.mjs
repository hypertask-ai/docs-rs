#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

import {
  collectLinks,
  collectStructure,
  collectText,
} from "../../../verify/driver.mjs";

const DESKTOP = { height: 900, width: 1440 };
const PHONE = { height: 844, width: 390 };
const TIMEOUT_MS = 45_000;
const BASE_PATH = "/ratstack";
const HOST = "docs.hypertask.ai";

const launch = async () => {
  try {
    return await chromium.launch();
  } catch (error) {
    console.error(
      `playwright could not start its own Chromium (${
        String(error).split("\n")[0]
      }), so this run uses /usr/bin/google-chrome`
    );

    return await chromium.launch({
      executablePath: "/usr/bin/google-chrome",
    });
  }
};

const normalizeLine = (text) => text.replaceAll(/\s+/gu, " ").trim();

const normalizeHref = (href) => {
  let out = href.trim();

  for (const origin of [`https://${HOST}${BASE_PATH}`, `https://${HOST}`]) {
    if (out.startsWith(origin)) {
      out = out.slice(origin.length);
    }
  }

  if (out.startsWith(`${BASE_PATH}/`)) {
    out = out.slice(BASE_PATH.length);
  }

  if (out.length > 1 && out.endsWith("/")) {
    out = out.slice(0, -1);
  }

  return out === "" ? "/" : out;
};

const capture = async (browser, url, viewport, outDir, name) => {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport,
  });

  const page = await context.newPage();
  const consoleErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(String(error));
  });

  try {
    const response = await page.goto(url, {
      timeout: TIMEOUT_MS,
      waitUntil: "load",
    });

    const headers =
      response === null
        ? {}
        : Object.fromEntries(
            Object.entries(await response.allHeaders()).filter(([key]) =>
              key.startsWith("x-")
            )
          );

    const structure = await collectStructure(page);
    const screenshot = path.join(outDir, `${name}.png`);

    await page.screenshot({ fullPage: true, path: screenshot });

    return {
      consoleErrors,
      finalUrl: page.url(),
      head: {
        canonical: structure.canonical,
        description: structure.description,
        lang: structure.lang,
        robots: structure.robots,
        title: structure.title,
      },
      headers,
      links: await collectLinks(page),
      screenshot,
      status: response === null ? null : response.status(),
      text: await collectText(page),
      url,
      viewport,
    };
  } finally {
    await context.close();
  }
};

const counts = (lines) => {
  const map = new Map();

  for (const line of lines) {
    map.set(line, (map.get(line) ?? 0) + 1);
  }

  return map;
};

const compareLines = (live, preview) => {
  const liveCounts = counts(live);
  const previewCounts = counts(preview);
  const missing = [];
  const extra = [];

  for (const [line, count] of liveCounts) {
    const kept = previewCounts.get(line) ?? 0;

    if (kept < count) {
      missing.push({ count: count - kept, line });
    }
  }

  for (const [line, count] of previewCounts) {
    const kept = liveCounts.get(line) ?? 0;

    if (kept < count) {
      extra.push({ count: count - kept, line });
    }
  }

  return { extra, missing };
};

const compareLinks = (live, preview) => {
  const pair = (links) => {
    const map = new Map();

    for (const link of links) {
      const key = normalizeHref(link.href);

      if (!map.has(key)) {
        map.set(key, new Set());
      }

      map.get(key).add(link.text);
    }

    return map;
  };

  const liveMap = pair(live);
  const previewMap = pair(preview);
  const missing = [];
  const extra = [];
  const changed = [];

  for (const [href, texts] of liveMap) {
    if (!previewMap.has(href)) {
      missing.push({ href, text: [...texts].join(" | ") });

      continue;
    }

    const liveText = [...texts].join(" | ");
    const previewText = [...previewMap.get(href)].join(" | ");

    if (liveText !== previewText) {
      changed.push({ href, preview: previewText, live: liveText });
    }
  }

  for (const [href, texts] of previewMap) {
    if (!liveMap.has(href)) {
      extra.push({ href, text: [...texts].join(" | ") });
    }
  }

  return { changed, extra, missing };
};

const compareHead = (live, preview) => {
  const mismatches = [];
  const pairs = [
    ["title", live.head.title, preview.head.title],
    ["description", live.head.description, preview.head.description],
    ["lang", live.head.lang, preview.head.lang],
    [
      "canonical",
      live.head.canonical === null ? null : normalizeHref(live.head.canonical),
      preview.head.canonical === null
        ? null
        : normalizeHref(preview.head.canonical),
    ],
  ];

  for (const [field, liveValue, previewValue] of pairs) {
    if (liveValue !== previewValue) {
      mismatches.push({ field, live: liveValue, preview: previewValue });
    }
  }

  const previewRobots = `${preview.head.robots ?? ""} ${
    preview.headers["x-robots-tag"] ?? ""
  }`;

  if (!previewRobots.includes("noindex")) {
    mismatches.push({
      field: "preview noindex",
      live: "none, the live site is indexed",
      preview: `robots meta ${preview.head.robots ?? "absent"}, X-Robots-Tag ${
        preview.headers["x-robots-tag"] ?? "absent"
      }`,
    });
  }

  if (`${live.head.robots ?? ""}`.includes("noindex")) {
    mismatches.push({
      field: "live noindex",
      live: live.head.robots,
      preview: "the reference must stay indexed",
    });
  }

  return mismatches;
};

const describeStatus = (side, page) => {
  const headers = page.headers;

  return `${side} ${page.finalUrl} answers ${page.status}${
    headers["x-content-generation"] === undefined
      ? ""
      : `, X-Content-Generation ${headers["x-content-generation"]}`
  }`;
};

const write = (file, body) => writeFile(file, body, "utf8");

const report = (name, dir, { head, links, status, text }) => {
  const differences = [];

  if (status.live !== 200 || status.preview !== 200) {
    differences.push(
      `status: live ${status.live}, preview ${status.preview}. Fix: the preview must serve the same address before its look can be compared.`
    );
  }

  for (const line of text.missing) {
    differences.push(`live text missing from the preview: ${line.line}`);
  }

  for (const line of text.extra) {
    differences.push(`text the live site does not have: ${line.line}`);
  }

  for (const link of links.missing) {
    differences.push(`live link missing from the preview: ${link.href}`);
  }

  for (const link of links.extra) {
    differences.push(`link the live site does not have: ${link.href}`);
  }

  for (const link of links.changed) {
    differences.push(
      `link text differs at ${link.href}: live "${link.live}", preview "${link.preview}"`
    );
  }

  for (const difference of head) {
    differences.push(
      `head ${difference.field} differs: live ${JSON.stringify(
        difference.live
      )}, preview ${JSON.stringify(difference.preview)}`
    );
  }

  console.log(`${name}: live and preview`);
  console.log(`  ${status.lines.live}`);
  console.log(`  ${status.lines.preview}`);
  console.log(
    `  text: ${text.missing.length} live lines missing, ${text.extra.length} extra lines`
  );
  console.log(
    `  links: ${links.missing.length} missing, ${links.extra.length} extra, ${links.changed.length} changed`
  );
  console.log(`  head: ${head.length} differences`);
  console.log(`  evidence: ${dir}`);

  if (differences.length === 0) {
    console.log(`${name}: PASS`);

    return 0;
  }

  for (const difference of differences.slice(0, 25)) {
    console.log(`  - ${difference}`);
  }

  if (differences.length > 25) {
    console.log(`  - and ${differences.length - 25} more differences`);
  }

  console.log(`${name}: FAIL (${differences.length} differences)`);

  return 1;
};

const compare = async (liveUrl, previewUrl, outDir, name) => {
  const browser = await launch();
  const dir = path.join(outDir, name);

  await mkdir(dir, { recursive: true });

  try {
    const liveDesktop = await capture(
      browser,
      liveUrl,
      DESKTOP,
      dir,
      "live-desktop"
    );

    const previewDesktop = await capture(
      browser,
      previewUrl,
      DESKTOP,
      dir,
      "preview-desktop"
    );

    const livePhone = await capture(browser, liveUrl, PHONE, dir, "live-phone");

    const previewPhone = await capture(
      browser,
      previewUrl,
      PHONE,
      dir,
      "preview-phone"
    );

    const text = compareLines(liveDesktop.text, previewDesktop.text);
    const links = compareLinks(liveDesktop.links, previewDesktop.links);
    const head = compareHead(liveDesktop, previewDesktop);

    const textDiff = [
      `live ${liveUrl} answers ${liveDesktop.status}`,
      `preview ${previewUrl} answers ${previewDesktop.status}`,
      `live lines ${liveDesktop.text.length}, preview lines ${previewDesktop.text.length}`,
      "",
      ...text.missing.map((line) => `- ${line.line}`),
      ...text.extra.map((line) => `+ ${line.line}`),
      "",
    ].join("\n");

    const linksDiff = [
      `live links ${liveDesktop.links.length}, preview links ${previewDesktop.links.length}`,
      "",
      ...links.missing.map((link) => `- ${link.href} ${link.text}`),
      ...links.extra.map((link) => `+ ${link.href} ${link.text}`),
      ...links.changed.map(
        (link) => `~ ${link.href} live "${link.live}" preview "${link.preview}"`
      ),
      "",
    ].join("\n");

    const headJson = JSON.stringify(
      {
        differences: head,
        live: {
          ...liveDesktop.head,
          finalUrl: liveDesktop.finalUrl,
          headers: liveDesktop.headers,
          status: liveDesktop.status,
        },
        preview: {
          ...previewDesktop.head,
          finalUrl: previewDesktop.finalUrl,
          headers: previewDesktop.headers,
          status: previewDesktop.status,
        },
      },
      null,
      2
    );

    await write(path.join(dir, "text-diff.txt"), textDiff);
    await write(path.join(dir, "links-diff.txt"), linksDiff);
    await write(path.join(dir, "head.json"), headJson);
    await write(
      path.join(dir, "pages.json"),
      JSON.stringify(
        {
          consoleErrors: {
            live: liveDesktop.consoleErrors,
            preview: previewDesktop.consoleErrors,
          },
          links,
          screenshots: [
            liveDesktop.screenshot,
            previewDesktop.screenshot,
            livePhone.screenshot,
            previewPhone.screenshot,
          ],
          text,
        },
        null,
        2
      )
    );

    return report(name, dir, {
      head,
      links,
      status: {
        lines: {
          live: describeStatus("live", liveDesktop),
          preview: describeStatus("preview", previewDesktop),
        },
        live: liveDesktop.status,
        preview: previewDesktop.status,
      },
      text,
    });
  } finally {
    await browser.close();
  }
};

const capturePage = async (url, outDir, name) => {
  const browser = await launch();
  const dir = path.join(outDir, name);

  await mkdir(dir, { recursive: true });

  try {
    const desktop = await capture(browser, url, DESKTOP, dir, "desktop");
    const phone = await capture(browser, url, PHONE, dir, "phone");

    await write(
      path.join(dir, "page.json"),
      JSON.stringify(
        {
          consoleErrors: {
            desktop: desktop.consoleErrors,
            phone: phone.consoleErrors,
          },
          desktop,
          phone,
        },
        null,
        2
      )
    );

    console.log(`${name}: ${describeStatus("page", desktop)}`);
    console.log(`  text lines: ${desktop.text.length}`);
    console.log(`  links: ${desktop.links.length}`);
    console.log(`  evidence: ${dir}`);

    return desktop.status === 200 ? 0 : 1;
  } finally {
    await browser.close();
  }
};

const openSearch = async (page) => {
  const button = page.getByRole("button", { name: "Search docs" });

  if ((await button.count()) === 0) {
    throw new Error(
      "the page has no search control named Search docs. Fix: the preview must keep the header search button and its accessible name."
    );
  }

  await button.first().click();

  const dialog = page.getByRole("dialog", { name: "Search docs" });

  await dialog.waitFor({ state: "visible", timeout: 15_000 });

  return dialog;
};

const settleResults = async (dialog, page) => {
  let last = -1;
  let stable = 0;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const count = await dialog.getByRole("link").count();

    if (count === last && count > 0) {
      stable += 1;

      if (stable >= 3) {
        return count;
      }
    } else {
      stable = 0;
      last = count;
    }

    await page.waitForTimeout(300);
  }

  return last;
};

const withPage = async (browser, url, width, run) => {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: width,
  });

  const page = await context.newPage();

  try {
    return await run(page);
  } finally {
    await context.close();
  }
};

const openJourneyPage = async (page, url, dir, prefix, command) => {
  const response = await page.goto(url, {
    timeout: TIMEOUT_MS,
    waitUntil: "load",
  });

  const status = response === null ? null : response.status();
  const shot = path.join(dir, `${prefix}-page.png`);

  await page.screenshot({ path: shot });

  if (status !== 200) {
    return {
      error: `${url} answers ${status}, so the ${command} journey cannot run on it. Fix: the preview must serve this address first; run the doctor, then land the missing slice.`,
      shot,
      status,
    };
  }

  return { shot, status };
};

const searchSide = async (browser, url, query, dir, prefix) =>
  withPage(browser, url, DESKTOP, async (page) => {
    const opened = await openJourneyPage(page, url, dir, prefix, "search");

    if (opened.error !== undefined) {
      return { ...opened, titles: [] };
    }

    const dialog = await openSearch(page);
    const dialogShot = path.join(dir, `${prefix}-dialog.png`);
    const initial = await dialog.getByRole("link").count();

    await page.screenshot({ path: dialogShot });

    const box = page.getByRole("textbox", { name: "Search docs" });

    if ((await box.count()) === 0) {
      return {
        ...opened,
        error:
          "the search dialog has no textbox named Search docs. Fix: keep the search input and its accessible name.",
        titles: [],
      };
    }

    await box.first().fill(query);

    await settleResults(dialog, page);

    const titles = (await dialog.getByRole("link").allInnerTexts()).map(
      normalizeLine
    );
    const resultShot = path.join(dir, `${prefix}-results.png`);

    await page.screenshot({ path: resultShot });

    const clear = page.getByRole("button", { name: "Clear" });
    let cleared = null;

    if ((await clear.count()) > 0) {
      await clear.first().click();
      await page.waitForFunction(
        () =>
          (document.querySelector("dialog[aria-label='Search docs'] input")
            ?.value ?? "") === "",
        undefined,
        { timeout: 10_000 }
      );

      cleared = await dialog.getByRole("link").count();
    }

    const clearShot = path.join(dir, `${prefix}-cleared.png`);

    await page.screenshot({ path: clearShot });

    return {
      ...opened,
      clearShot,
      cleared,
      dialogShot,
      initial,
      resultShot,
      titles,
    };
  });

const changelogSide = async (browser, url, area, dir, prefix) =>
  withPage(browser, url, DESKTOP, async (page) => {
    const opened = await openJourneyPage(page, url, dir, prefix, "changelog");

    if (opened.error !== undefined) {
      return opened;
    }

    const select = page.getByRole("combobox");

    if ((await select.count()) === 0) {
      return {
        ...opened,
        error:
          "the page has no area select. Fix: keep the changelog area filter and its combobox.",
      };
    }

    const counter = page.locator("[aria-live]").first();
    const before = normalizeLine(await counter.innerText());
    const beforeShot = path.join(dir, `${prefix}-all.png`);

    await page.screenshot({ path: beforeShot });

    await select.first().selectOption({ label: area });

    await page.waitForFunction(
      (previous) =>
        (document.querySelector("[aria-live]")?.textContent ?? "").trim() !==
        previous,
      before,
      { timeout: 15_000 }
    );

    const after = normalizeLine(await counter.innerText());
    const afterShot = path.join(dir, `${prefix}-area.png`);

    await page.screenshot({ path: afterShot });

    return { ...opened, after, afterShot, before, beforeShot };
  });

const driveSearch = async (liveUrl, previewUrl, query, outDir, name) => {
  const browser = await launch();
  const dir = path.join(outDir, name);

  await mkdir(dir, { recursive: true });

  try {
    const live = await searchSide(browser, liveUrl, query, dir, "live");
    const preview = await searchSide(
      browser,
      previewUrl,
      query,
      dir,
      "preview"
    );
    const differences = [];

    if (live.error !== undefined) {
      differences.push(`live: ${live.error}`);
    }

    if (preview.error !== undefined) {
      differences.push(`preview: ${preview.error}`);
    }

    if (live.titles.length === 0 && live.error === undefined) {
      differences.push(`live returns no result for "${query}"`);
    }

    if (preview.titles.length === 0 && preview.error === undefined) {
      differences.push(
        `preview returns no result for "${query}". Fix: the preview must build the search index at publish time.`
      );
    }

    if (live.error === undefined && live.initial !== 0) {
      differences.push(
        `live lists ${live.initial} results before a query, so the dialog does not open empty`
      );
    }

    if (preview.error === undefined && preview.initial !== 0) {
      differences.push(
        `preview lists ${preview.initial} results before a query, so the dialog does not open empty`
      );
    }

    if (live.error === undefined && live.cleared !== 0) {
      differences.push(
        `live still lists ${live.cleared} results after Clear, so the query is not cleared`
      );
    }

    if (preview.error === undefined && preview.cleared !== 0) {
      differences.push(
        `preview still lists ${preview.cleared} results after Clear, so the query is not cleared`
      );
    }

    const shared = Math.min(live.titles.length, preview.titles.length);

    for (let index = 0; index < shared; index += 1) {
      if (live.titles[index] !== preview.titles[index]) {
        differences.push(
          `result ${index + 1} differs: live "${live.titles[index]}", preview "${
            preview.titles[index]
          }"`
        );
      }
    }

    if (live.titles.length !== preview.titles.length) {
      differences.push(
        `result count differs: live ${live.titles.length}, preview ${preview.titles.length}`
      );
    }

    await write(
      path.join(dir, "search.json"),
      JSON.stringify({ live, preview, query }, null, 2)
    );

    console.log(`search "${query}"`);
    console.log(
      `  live ${liveUrl}: ${
        live.error === undefined ? `${live.titles.length} results` : live.error
      }`
    );
    console.log(
      `  preview ${previewUrl}: ${
        preview.error === undefined
          ? `${preview.titles.length} results`
          : preview.error
      }`
    );
    console.log(`  evidence: ${dir}`);

    for (const difference of differences.slice(0, 15)) {
      console.log(`  - ${difference}`);
    }

    if (differences.length === 0) {
      console.log("search: PASS");

      return 0;
    }

    console.log(`search: FAIL (${differences.length} differences)`);

    return 1;
  } finally {
    await browser.close();
  }
};

const driveChangelog = async (liveUrl, previewUrl, area, outDir, name) => {
  const browser = await launch();
  const dir = path.join(outDir, name);

  await mkdir(dir, { recursive: true });

  try {
    const live = await changelogSide(browser, liveUrl, area, dir, "live");
    const preview = await changelogSide(
      browser,
      previewUrl,
      area,
      dir,
      "preview"
    );
    const differences = [];
    const countedBefore = /^\d+ updates?$/u;
    const countedAfter = (text) =>
      text.includes(area) && /\d+ update/u.test(text);

    if (live.error !== undefined) {
      differences.push(`live: ${live.error}`);
    }

    if (preview.error !== undefined) {
      differences.push(`preview: ${preview.error}`);
    }

    if (live.error === undefined && !countedBefore.test(live.before)) {
      differences.push(
        `live count line reads "${live.before}", not a count of updates`
      );
    }

    if (preview.error === undefined && !countedBefore.test(preview.before)) {
      differences.push(
        `preview count line reads "${preview.before}", not a count of updates`
      );
    }

    if (live.error === undefined && !countedAfter(live.after)) {
      differences.push(
        `live count line after ${area} reads "${live.after}" and does not name the area`
      );
    }

    if (preview.error === undefined && !countedAfter(preview.after)) {
      differences.push(
        `preview count line after ${area} reads "${preview.after}" and does not name the area`
      );
    }

    await write(
      path.join(dir, "changelog.json"),
      JSON.stringify({ area, live, preview }, null, 2)
    );

    const describeSide = (label, url, side) =>
      side.error === undefined
        ? `  ${label} ${url}: "${side.before}" then "${side.after}"`
        : `  ${label} ${url}: ${side.error}`;

    console.log(`changelog ${area}`);
    console.log(describeSide("live", liveUrl, live));
    console.log(describeSide("preview", previewUrl, preview));
    console.log(`  evidence: ${dir}`);

    for (const difference of differences.slice(0, 15)) {
      console.log(`  - ${difference}`);
    }

    if (differences.length === 0) {
      console.log("changelog: PASS");

      return 0;
    }

    console.log(`changelog: FAIL (${differences.length} differences)`);

    return 1;
  } finally {
    await browser.close();
  }
};

const usage = () => {
  console.error(
    "usage: drive.mjs page <url> <evidence-dir> <name>\n" +
      "       drive.mjs diff <live-url> <preview-url> <evidence-dir> <name>\n" +
      "       drive.mjs search <live-url> <preview-url> <query> <evidence-dir> <name>\n" +
      "       drive.mjs changelog <live-url> <preview-url> <area> <evidence-dir> <name>"
  );
};

const main = async (argv) => {
  const [command, ...rest] = argv;

  switch (command) {
    case "page": {
      const [url, outDir, name = "page"] = rest;

      if (url === undefined || outDir === undefined) {
        usage();

        return 2;
      }

      return await capturePage(url, outDir, name);
    }
    case "diff": {
      const [liveUrl, previewUrl, outDir, name = "diff"] = rest;

      if (
        liveUrl === undefined ||
        previewUrl === undefined ||
        outDir === undefined
      ) {
        usage();

        return 2;
      }

      return await compare(liveUrl, previewUrl, outDir, name);
    }
    case "search": {
      const [liveUrl, previewUrl, query, outDir, name = "search"] = rest;

      if ([liveUrl, previewUrl, query, outDir].includes(undefined)) {
        usage();

        return 2;
      }

      return await driveSearch(liveUrl, previewUrl, query, outDir, name);
    }
    case "changelog": {
      const [liveUrl, previewUrl, area, outDir, name = "changelog"] = rest;

      if ([liveUrl, previewUrl, area, outDir].includes(undefined)) {
        usage();

        return 2;
      }

      return await driveChangelog(liveUrl, previewUrl, area, outDir, name);
    }
    default: {
      usage();

      return 2;
    }
  }
};

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`drive.mjs failed: ${String(error)}`);
  console.error(
    "Fix: run node .claude/skills/verify-docs-rs/doctor.mjs first, then run the same command again."
  );

  process.exitCode = 1;
}
