import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectDiff } from "./diff.mjs";

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string}
 */
const git = (cwd, args) =>
  execFileSync("git", args, { cwd, encoding: "utf-8" });

/**
 * @returns {string}
 */
const makeRepository = () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "verifier-diff-"));

  git(cwd, ["init", "--quiet", "--initial-branch=main"]);
  git(cwd, ["config", "user.email", "verifier@example.test"]);
  git(cwd, ["config", "user.name", "Verifier"]);

  return cwd;
};

/**
 * @param {string} cwd
 * @param {string} message
 * @returns {string}
 */
const commit = (cwd, message) => {
  git(cwd, ["add", "--all"]);
  git(cwd, ["commit", "--quiet", "--message", message]);

  return git(cwd, ["rev-parse", "HEAD"]).trim();
};

await test("reads the change from the checkout without the pull request diff endpoint", () => {
  const cwd = makeRepository();

  try {
    writeFileSync(path.join(cwd, "readme.md"), "first line\nsecond line\n");

    const base = commit(cwd, "first");

    writeFileSync(path.join(cwd, "readme.md"), "first line\nchanged line\n");

    writeFileSync(path.join(cwd, "guide.md"), "new page\n");

    const head = commit(cwd, "second");

    const facts = collectDiff(base, head, path.join(cwd, "out"), cwd);

    assert.equal(facts.files, 2);
    assert.equal(facts.added, 2);
    assert.equal(facts.removed, 1);
    assert.equal(facts.binaryFiles, 0);
    assert.equal(facts.capped, false);
    assert.equal(facts.threeDot, true);
    assert.equal(facts.mergeBase, base);
    assert.ok(facts.bytes > 0);
    assert.ok(readFileSync(facts.diffPath, "utf-8").startsWith("diff --git "));

    const files = readFileSync(facts.filesPath, "utf-8");

    assert.match(files, /2 files changed, \+2 -1, 0 binary/u);
    assert.match(files, /\+1 -0 guide\.md/u);
    assert.match(files, /\+1 -1 readme\.md/u);
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
});

await test("reads a change with more than three hundred files and caps the prompt copy", () => {
  const cwd = makeRepository();

  try {
    writeFileSync(path.join(cwd, "readme.md"), "root\n");

    const base = commit(cwd, "first");

    mkdirSync(path.join(cwd, "pages"), { recursive: true });

    for (let index = 0; index < 320; index += 1) {
      writeFileSync(
        path.join(cwd, `pages/page-${String(index).padStart(3, "0")}.md`),
        `page ${String(index)}\n`
      );
    }

    const head = commit(cwd, "second");

    const facts = collectDiff(base, head, path.join(cwd, "out"), cwd, 400);

    assert.equal(facts.files, 320);
    assert.equal(facts.added, 320);
    assert.equal(facts.capped, true);
    assert.ok(facts.cappedBytes <= 400);
    assert.ok(facts.cappedBytes < facts.bytes);

    const capped = readFileSync(
      path.join(cwd, "out", "pr.diff.capped"),
      "utf-8"
    );

    assert.ok(readFileSync(facts.diffPath, "utf-8").startsWith(capped));
    assert.match(capped, /\n$/u);

    const files = readFileSync(facts.filesPath, "utf-8");

    assert.match(files, /320 files changed/u);
    assert.match(files, /prompt copy capped at/u);
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
});
