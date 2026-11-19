#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const liveUrl = process.env.LIVE_DOCS_URL ?? "https://docs.hypertask.ai/";
const previewUrl =
  process.env.PREVIEW_DOCS_URL ?? "https://docs.hypertask.ai/ratstack/";
const publishWorkflow = "publish-ratstack.yml";
const publishRepo = "hypertask-ai/docs-rs";
const siteInputs = [".brain", "apps/web", "apps/site", "packages"];
const timeoutMs = 30_000;

const failures = [];
const skips = [];

const pass = (line) => console.log(`PASS ${line}`);
const fail = (code, line) => {
  failures.push(code);

  console.log(`FAIL ${line}`);
};
const skip = (code, line) => {
  skips.push(code);

  console.log(`SKIP ${line}`);
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const body = await response.text();

  return {
    body,
    contentType: response.headers.get("content-type") ?? "",
    generation: response.headers.get("x-content-generation"),
    redirected: response.redirected,
    robotsHeader: response.headers.get("x-robots-tag") ?? "",
    status: response.status,
    url: response.url,
  };
};

const robotsMeta = (html) =>
  /<meta[^>]*name="robots"[^>]*content="(?<content>[^"]*)"/u.exec(html)?.groups
    ?.content ?? "";

const checkPlaywright = async () => {
  try {
    const resolved = createRequire(import.meta.url).resolve("playwright");
    const manifest = JSON.parse(
      readFileSync(path.join(path.dirname(resolved), "package.json"), "utf8")
    );

    pass(`playwright ${manifest.version} resolves from ${resolved}`);
  } catch (error) {
    fail(
      "playwright",
      `playwright does not resolve from this checkout (${String(error).split("\n")[0]}). Fix: install the checkout's dependencies, or link an existing install into node_modules, then run this doctor again; drive.mjs needs playwright and its Chromium.`
    );
  }
};

const checkLive = async () => {
  let page;

  try {
    page = await fetchText(liveUrl);
  } catch (error) {
    fail(
      "live-unreachable",
      `${liveUrl} did not answer: ${String(error)}. Fix: check the network, then run this doctor again.`
    );

    return;
  }

  if (page.status !== 200 || !page.contentType.includes("text/html")) {
    fail(
      "live-status",
      `${liveUrl} answered ${page.status} ${page.contentType}. Fix: the live docs site must answer 200 text/html before it can be the reference.`
    );

    return;
  }

  if (
    page.robotsHeader.includes("noindex") ||
    robotsMeta(page.body).includes("noindex")
  ) {
    fail(
      "live-noindex",
      `${liveUrl} is noindex, so it cannot be the reference for a preview that must stay out of search. Fix: check LIVE_DOCS_URL.`
    );

    return;
  }

  pass(`live answers 200 text/html at ${page.url}`);
};

const checkPreview = async () => {
  let page;

  try {
    page = await fetchText(previewUrl);
  } catch (error) {
    fail(
      "preview-unreachable",
      `${previewUrl} did not answer: ${String(error)}. Fix: check the network, then run this doctor again.`
    );

    return;
  }

  if (page.status !== 200 || !page.contentType.includes("text/html")) {
    fail(
      "preview-status",
      `${previewUrl} answered ${page.status} ${page.contentType}. Fix: land the publish slice HYST-18 on main, then run .github/workflows/publish-ratstack.yml from main and wait for it to finish; nothing is published at that address until it does.`
    );

    return;
  }

  const redirect = page.redirected
    ? `, redirected to ${page.url}`
    : ` at ${page.url}`;

  pass(`preview answers 200 text/html${redirect}`);

  const missing = [];

  if (!page.robotsHeader.includes("noindex")) {
    missing.push("the X-Robots-Tag header");
  }

  if (!robotsMeta(page.body).includes("noindex")) {
    missing.push("the robots meta tag");
  }

  if (missing.length > 0) {
    fail(
      "preview-noindex",
      `the preview page is missing noindex in ${missing.join(" and ")}. Fix: the publish build must set SITE_BASE_PATH=/ratstack, which owns both the header and the meta tag.`
    );
  } else {
    pass("preview carries noindex in X-Robots-Tag and the robots meta tag");
  }

  if (page.generation === null) {
    fail(
      "preview-generation",
      `the preview answers without X-Content-Generation, so two builds cannot be told apart. Fix: the publish build writes that header from the content build in apps/web/scripts/reader-build.ts; check the deployed _headers file.`
    );
  } else {
    pass(`preview build id is X-Content-Generation ${page.generation}`);
  }
};

const git = (args) =>
  spawnSync("git", args, {
    encoding: "utf8",
    timeout: 60_000,
  });

const checkBuild = async () => {
  const fetched = git(["fetch", "--quiet", "origin", "main"]);

  if (fetched.status !== 0) {
    skip(
      "git-fetch",
      `git could not fetch origin/main (${(fetched.stderr ?? "").trim().split("\n")[0]}), so the freshness check reads the last known origin/main. Fix: fetch main, then run this doctor again.`
    );
  }

  const listed = spawnSync(
    "gh",
    [
      "run",
      "list",
      `--workflow=${publishWorkflow}`,
      `--repo=${publishRepo}`,
      "--branch=main",
      "--limit=20",
      "--json=databaseId,conclusion,createdAt,headSha,url",
    ],
    { encoding: "utf8", timeout: 120_000 }
  );

  if (listed.status !== 0) {
    skip(
      "publish-runs",
      `gh could not list ${publishWorkflow} runs on main (${(listed.stderr ?? "").trim().split("\n")[0]}). Fix: an HTTP 404 here means the workflow is not on main yet, so land the publish slice HYST-18 first; any other error means run gh auth status.`
    );

    return;
  }

  let runs;

  try {
    runs = JSON.parse(listed.stdout);
  } catch (error) {
    skip(
      "publish-runs-json",
      `gh returned unreadable run data (${String(error)}). Fix: run gh run list --workflow=${publishWorkflow} --branch=main by hand.`
    );

    return;
  }

  const newest = runs.find((run) => run.conclusion === "success");

  if (newest === undefined) {
    fail(
      "publish-never-succeeded",
      `no successful run of ${publishWorkflow} on main yet. Fix: run the workflow on main and wait for it to succeed before driving the preview.`
    );

    return;
  }

  const sha = newest.headSha.toLowerCase();
  const counted = git([
    "rev-list",
    "--count",
    `${sha}..origin/main`,
    "--",
    ...siteInputs,
  ]);

  if (counted.status !== 0) {
    skip(
      "git-count",
      `git could not compare ${sha.slice(0, 7)} with origin/main (${(counted.stderr ?? "").trim().split("\n")[0]}). Fix: the run's commit may not be fetched; fetch main and this commit, then run the doctor again.`
    );

    return;
  }

  const behind = Number((counted.stdout ?? "0").trim());

  if (behind !== 0) {
    const changed = git([
      "log",
      "--oneline",
      "-5",
      `${sha}..origin/main`,
      "--",
      ...siteInputs,
    ]);

    fail(
      "preview-stale",
      `${behind} site change${
        behind === 1 ? "" : "s"
      } on main after the newest successful publish run ${newest.databaseId} (${sha.slice(0, 7)}, ${newest.createdAt}): ${String(
        changed.stdout ?? ""
      )
        .trim()
        .split("\n")
        .join(
          "; "
        )}. Fix: wait for the publish run on the current main, then drive the preview.`
    );

    return;
  }

  pass(
    `preview is the current build: publish run ${newest.databaseId} on ${sha.slice(0, 7)} ${newest.createdAt}, no site change after it`
  );
};

await checkPlaywright();
await checkLive();
await checkPreview();
await checkBuild();

if (skips.length > 0) {
  console.log(`doctor notes: ${skips.join(", ")} did not run`);
}

if (failures.length > 0) {
  console.log(`doctor: FAIL (${failures.join(", ")})`);

  process.exitCode = 1;
} else {
  console.log("doctor: PASS");
}
