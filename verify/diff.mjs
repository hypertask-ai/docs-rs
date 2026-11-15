import { spawnSync } from "node:child_process";
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_LIMIT_BYTES = 200_000;

const MAX_BUFFER_BYTES = 67_108_864;

const MAX_FILE_LINES = 800;

const DIFF_FLAGS = [
  "diff",
  "--no-color",
  "--no-ext-diff",
  "--find-renames",
  "--src-prefix=a/",
  "--dst-prefix=b/",
];

const USAGE =
  "usage: node verify/diff.mjs --base <sha> --head <sha> --out <dir> [--limit <bytes>] [--repo <dir>]";

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
const git = (cwd, args) => {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER_BYTES,
  });

  if (result.error !== undefined) {
    throw new Error(
      `git ${args.join(" ")} did not run: ${String(result.error)}`
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} exited ${String(result.status)}: ${result.stderr.trim()}`
    );
  }

  return result;
};

/**
 * @param {string} cwd
 * @param {string} sha
 * @returns {boolean}
 */
const hasCommit = (cwd, sha) => {
  const result = spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
    cwd,
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER_BYTES,
  });

  return result.status === 0;
};

/**
 * @param {string} cwd
 * @param {string} sha
 * @returns {void}
 */
const ensureCommit = (cwd, sha) => {
  if (hasCommit(cwd, sha)) {
    return;
  }

  git(cwd, ["fetch", "--no-tags", "--depth=1", "origin", sha]);

  if (!hasCommit(cwd, sha)) {
    throw new Error(
      `commit ${sha} is not in the checkout and could not be fetched`
    );
  }
};

/**
 * @param {string} cwd
 * @param {string} base
 * @param {string} head
 * @returns {string | null}
 */
const mergeBaseOf = (cwd, base, head) => {
  const result = spawnSync("git", ["merge-base", base, head], {
    cwd,
    encoding: "utf-8",
    maxBuffer: MAX_BUFFER_BYTES,
  });

  if (result.status !== 0) {
    return null;
  }

  const found = result.stdout.trim();

  return found === "" ? null : found;
};

/**
 * @param {string} text
 * @returns {{ added: number | null, path: string, removed: number | null }[]}
 */
const parseRows = (text) => {
  const rows = [];

  for (const line of text.split("\n")) {
    if (line === "") {
      continue;
    }

    const [added, removed, ...rest] = line.split("\t");

    rows.push({
      added: added === "-" ? null : Number(added),
      path: rest.join("\t"),
      removed: removed === "-" ? null : Number(removed),
    });
  }

  return rows.toSorted((left, right) => left.path.localeCompare(right.path));
};

/**
 * @param {string} cwd
 * @param {string[]} range
 * @param {string} file
 * @returns {void}
 */
const writeDiff = (cwd, range, file) => {
  const descriptor = openSync(file, "w");

  try {
    const result = spawnSync("git", [...DIFF_FLAGS, ...range], {
      cwd,
      maxBuffer: MAX_BUFFER_BYTES,
      stdio: ["ignore", descriptor, "inherit"],
    });

    if (result.error !== undefined) {
      throw new Error(`git diff did not run: ${String(result.error)}`);
    }

    if (result.status !== 0) {
      throw new Error(`git diff exited ${String(result.status)}`);
    }
  } finally {
    closeSync(descriptor);
  }
};

/**
 * @param {string} file
 * @param {string} cappedFile
 * @param {number} limit
 * @returns {{ bytes: number, capped: boolean, cappedBytes: number }}
 */
const capFile = (file, cappedFile, limit) => {
  const content = readFileSync(file);

  if (content.byteLength <= limit) {
    writeFileSync(cappedFile, content);

    return {
      bytes: content.byteLength,
      capped: false,
      cappedBytes: content.byteLength,
    };
  }

  const slice = content.subarray(0, limit);

  const lastBreak = slice.lastIndexOf(0x0a);

  const kept = lastBreak > 0 ? slice.subarray(0, lastBreak + 1) : slice;

  writeFileSync(cappedFile, kept);

  return {
    bytes: content.byteLength,
    capped: true,
    cappedBytes: kept.byteLength,
  };
};

/**
 * @param {{ added: number | null, path: string, removed: number | null }[]} rows
 * @returns {string[]}
 */
const fileLines = (rows) => {
  const lines = [];

  for (const row of rows.slice(0, MAX_FILE_LINES)) {
    const added = row.added === null ? "binary" : `+${row.added}`;

    const removed = row.removed === null ? "binary" : `-${row.removed}`;

    lines.push(`${added} ${removed} ${row.path}`);
  }

  if (rows.length > MAX_FILE_LINES) {
    lines.push(`${rows.length - MAX_FILE_LINES} more files, see the full diff`);
  }

  return lines;
};

/**
 * @param {string} base
 * @param {string} head
 * @param {string} out
 * @param {string} [repository]
 * @param {number} [limit]
 */
export const collectDiff = (
  base,
  head,
  out,
  repository = process.cwd(),
  limit = DEFAULT_LIMIT_BYTES
) => {
  const cwd = path.resolve(repository);

  const directory = path.resolve(out);

  mkdirSync(directory, { recursive: true });

  ensureCommit(cwd, base);

  ensureCommit(cwd, head);

  const mergeBase = mergeBaseOf(cwd, base, head);

  const range = mergeBase === null ? [base, head] : [mergeBase, head];

  const rows = parseRows(
    git(cwd, ["diff", "--find-renames", "--numstat", ...range]).stdout
  );

  const diffPath = path.join(directory, "pr.diff");

  const cappedPath = path.join(directory, "pr.diff.capped");

  const filesPath = path.join(directory, "pr-files.txt");

  writeDiff(cwd, range, diffPath);

  const capped = capFile(diffPath, cappedPath, limit);

  let added = 0;

  let removed = 0;

  let binaryFiles = 0;

  for (const row of rows) {
    if (row.added === null || row.removed === null) {
      binaryFiles += 1;

      continue;
    }

    added += row.added;

    removed += row.removed;
  }

  const header = [
    `base ${base}`,
    `head ${head}`,
    mergeBase === null
      ? "no merge base, compared the two commits"
      : `merge base ${mergeBase}`,
    `${rows.length} files changed, +${added} -${removed}, ${binaryFiles} binary`,
    `${capped.bytes} bytes of diff, ${capped.capped ? `prompt copy capped at ${capped.cappedBytes}` : "complete"}`,
  ];

  writeFileSync(filesPath, [...header, ...fileLines(rows)].join("\n"));

  return {
    added,
    base,
    binaryFiles,
    bytes: capped.bytes,
    capped: capped.capped,
    cappedBytes: capped.cappedBytes,
    diffPath,
    files: rows.length,
    filesPath,
    head,
    limit,
    mergeBase,
    removed,
    threeDot: mergeBase !== null,
  };
};

/**
 * @param {string[]} args
 * @param {string} name
 * @returns {string | undefined}
 */
const optionValue = (args, name) => {
  const index = args.indexOf(name);

  return index === -1 ? undefined : args[index + 1];
};

/**
 * @returns {void}
 */
const main = () => {
  const args = process.argv.slice(2);

  const base = optionValue(args, "--base");

  const head = optionValue(args, "--head");

  const out = optionValue(args, "--out");

  const rawLimit = optionValue(args, "--limit");

  const limit = rawLimit === undefined ? DEFAULT_LIMIT_BYTES : Number(rawLimit);

  if (base === undefined || head === undefined || out === undefined) {
    console.error(USAGE);

    process.exitCode = 2;

    return;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    console.error(`--limit must be a positive number of bytes\n${USAGE}`);

    process.exitCode = 2;

    return;
  }

  try {
    const repository = optionValue(args, "--repo");

    const facts =
      repository === undefined
        ? collectDiff(base, head, out, undefined, limit)
        : collectDiff(base, head, out, repository, limit);

    console.log(JSON.stringify(facts, null, 2));
  } catch (error) {
    console.error(`diff failed: ${String(error)}`);

    process.exitCode = 1;
  }
};

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
