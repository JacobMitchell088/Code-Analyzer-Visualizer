#!/usr/bin/env node
/**
 * CLI entry point for JS/TS static analysis.
 * Usage: node analysis_worker.js --path <repo_root>
 * Outputs a single JSON blob to stdout.
 */
"use strict";

const path = require("path");
const { analyzeComplexity } = require("./src/complexity");
const { analyzeDependencies } = require("./src/dependencies");
const { analyzeDeadCode } = require("./src/dead_code");
const { analyzeDuplicates } = require("./src/duplicates");
const { walkFiles } = require("./src/file_walker");

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--path");
  if (idx === -1 || !args[idx + 1]) {
    console.error("Usage: node analysis_worker.js --path <repo_root>");
    process.exit(1);
  }
  return path.resolve(args[idx + 1]);
}

async function main() {
  const repoRoot = parseArgs();
  const files = walkFiles(repoRoot);

  const [complexity, dependencies, dead_code, duplicates] = await Promise.all([
    analyzeComplexity(files, repoRoot),
    analyzeDependencies(files, repoRoot),
    analyzeDeadCode(files, repoRoot),
    analyzeDuplicates(files),
  ]);

  const result = { complexity, dependencies, dead_code, duplicates };
  process.stdout.write(JSON.stringify(result));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
