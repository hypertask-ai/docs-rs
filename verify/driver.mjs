import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

export const WIDTHS = { desktop: 1440, phone: 390 };

const HEIGHTS = { desktop: 900, phone: 844 };

const TIMEOUT_MS = 30_000;

/**
 * @typedef {{ context: import("playwright").BrowserContext, errors: string[], page: import("playwright").Page, status: number | null, url: string, width: number }} PageEntry
 */

/**
 * @param {string} url
 * @returns {Promise<object>}
 */
export const statusOf = async (url) => {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await response.arrayBuffer();

  return {
    bytes: body.byteLength,
    contentType: response.headers.get("content-type"),
    headers: Object.fromEntries(response.headers.entries()),
    location: response.headers.get("location"),
    status: response.status,
    url,
  };
};

/**
 * @param {import("playwright").Browser} browser
 * @param {string} url
 * @param {number} [width]
 * @returns {Promise<PageEntry>}
 */
export const openPage = async (browser, url, width = WIDTHS.desktop) => {
  const phone = width <= 600;

  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { height: phone ? HEIGHTS.phone : HEIGHTS.desktop, width },
  });

  const page = await context.newPage();

  /** @type {string[]} */
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(String(error));
  });

  const response = await page.goto(url, {
    timeout: TIMEOUT_MS,
    waitUntil: "load",
  });

  return {
    context,
    errors,
    page,
    status: response === null ? null : response.status(),
    url,
    width,
  };
};

/**
 * @param {import("playwright").Page} page
 * @returns {Promise<{ href: string | null, text: string }[]>}
 */
export const collectLinks = async (page) => {
  const links = await page.locator("a[href]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute("href"),
      text: (node.textContent ?? "").replaceAll(/\s+/gu, " ").trim(),
    }))
  );

  return [
    ...new Map(
      links.map((link) => [`${link.href}\u0000${link.text}`, link])
    ).values(),
  ];
};

/**
 * @param {import("playwright").Page} page
 * @returns {Promise<object>}
 */
export const collectStructure = (page) =>
  page.evaluate(() => ({
    canonical:
      document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
      null,
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") ?? null,
    headings: [...document.querySelectorAll("h1, h2, h3")].map((node) => ({
      level: Number(node.tagName.slice(1)),
      text: (node.textContent ?? "").replaceAll(/\s+/gu, " ").trim(),
    })),
    landmarks: {
      aside: document.querySelectorAll("aside").length,
      footer: document.querySelectorAll("footer").length,
      header: document.querySelectorAll("header").length,
      main: document.querySelectorAll("main").length,
      nav: document.querySelectorAll("nav").length,
    },
    lang: document.documentElement.lang || null,
    robots:
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ??
      null,
    title: document.title,
  }));

/**
 * @param {import("playwright").Page} page
 * @returns {Promise<string[]>}
 */
export const collectText = (page) =>
  page.evaluate(() => {
    const skipped = new Set(["NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE"]);
    const separates =
      /^(block|flex|flow-root|grid|list-item|table|table-cell|table-row)$/u;

    /**
     * @param {Node} node
     * @returns {string}
     */
    const read = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? "";
      }

      if (!(node instanceof Element)) {
        return "";
      }

      if (
        skipped.has(node.tagName) ||
        (node instanceof HTMLElement && node.hidden)
      ) {
        return "";
      }

      const style = getComputedStyle(node);

      if (style.display === "none" || style.visibility === "hidden") {
        return "";
      }

      const children = [...node.childNodes]
        .map((child) => read(child))
        .join("");

      return separates.test(style.display) ? `\n${children}\n` : children;
    };

    return read(document.body)
      .split("\n")
      .map((line) => line.replaceAll(/\s+/gu, " ").trim())
      .filter((line) => line !== "");
  });

/**
 * @param {PageEntry} entry
 * @returns {string[]}
 */
export const consoleErrors = (entry) => [...entry.errors];

/**
 * @param {import("playwright").Browser} browser
 * @param {string} url
 * @param {string} outDir
 * @param {string} name
 * @returns {Promise<string[]>}
 */
export const screenshot = async (browser, url, outDir, name) => {
  await mkdir(outDir, { recursive: true });

  const files = await Promise.all(
    Object.entries(WIDTHS).map(async ([label, width]) => {
      const entry = await openPage(browser, url, width);

      const file = path.join(outDir, `${name}-${label}.png`);

      await entry.page.screenshot({ fullPage: true, path: file });

      await entry.context.close();

      return file;
    })
  );

  return files;
};

/**
 * @param {string} url
 * @param {string} outDir
 * @param {string} name
 * @returns {Promise<object>}
 */
export const snapshot = async (url, outDir, name) => {
  const browser = await chromium.launch();

  try {
    const desktop = await openPage(browser, url, WIDTHS.desktop);

    const structure = await collectStructure(desktop.page);

    const links = await collectLinks(desktop.page);

    const desktopErrors = consoleErrors(desktop);

    await desktop.context.close();

    const phone = await openPage(browser, url, WIDTHS.phone);

    const phoneErrors = consoleErrors(phone);

    await phone.context.close();

    const files = await screenshot(browser, url, outDir, name);

    return {
      consoleErrors: { desktop: desktopErrors, phone: phoneErrors },
      links,
      screenshots: files,
      status: await statusOf(url),
      structure,
      url,
    };
  } finally {
    await browser.close();
  }
};

/**
 * @returns {Promise<void>}
 */
const main = async () => {
  const [url, outArg, nameArg] = process.argv.slice(2);

  if (url === undefined) {
    console.error("usage: node verify/driver.mjs <url> [outDir] [name]");

    process.exitCode = 2;

    return;
  }

  const outDir =
    outArg ?? path.join(process.env.RUNNER_TEMP ?? "/tmp", "driver");

  const name = nameArg ?? "page";

  const wanted = url.startsWith("http")
    ? url
    : `${process.env.SITE_URL ?? "http://127.0.0.1:4173"}${url}`;

  try {
    const result = await snapshot(wanted, outDir, name);

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`driver failed for ${wanted}: ${String(error)}`);

    process.exitCode = 1;
  }
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
