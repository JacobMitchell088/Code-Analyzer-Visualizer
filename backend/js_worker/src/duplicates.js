"use strict";

const fs = require("fs");
const acorn = require("acorn");
const crypto = require("crypto");

const K_GRAM_SIZE = 6;
const WINDOW_SIZE = 5;

/**
 * Token-based duplicate detection via Winnowing algorithm.
 */
async function analyzeDuplicates(files) {
  const fingerprints = new Map(); // hash -> [{relPath, lineStart, lineEnd}]

  for (const file of files) {
    let source;
    try {
      source = fs.readFileSync(file.absPath, "utf8");
    } catch {
      continue;
    }

    const tokens = _tokenize(source, file.language);
    if (tokens.length < K_GRAM_SIZE) continue;

    const fps = _winnow(tokens);
    for (const { hash, lineStart, lineEnd } of fps) {
      if (!fingerprints.has(hash)) fingerprints.set(hash, []);
      fingerprints.get(hash).push({ relPath: file.relPath, lineStart, lineEnd });
    }
  }

  const groups = [];
  let totalDupLines = 0;
  const seen = new Set();

  for (const [hash, locations] of fingerprints) {
    if (locations.length < 2) continue;

    // Deduplicate by file+line
    const unique = [...new Map(locations.map((l) => [`${l.relPath}:${l.lineStart}`, l])).values()];
    if (unique.length < 2) continue;

    const blockId = hash.toString(16);
    if (seen.has(blockId)) continue;
    seen.add(blockId);

    const instances = unique.map((loc) => ({
      file_path: loc.relPath,
      line_start: loc.lineStart,
      line_end: loc.lineEnd,
      snippet: _extractSnippet(
        files.find((f) => f.relPath === loc.relPath)?.absPath,
        loc.lineStart,
      ),
    }));

    const dupLines = unique.reduce((sum, l) => sum + Math.max(1, l.lineEnd - l.lineStart), 0);
    totalDupLines += dupLines;

    groups.push({
      block_id: blockId,
      instances,
      token_count: K_GRAM_SIZE,
      language: "javascript",
    });
  }

  return { groups, total_duplicate_lines: totalDupLines };
}

function _tokenize(source, language) {
  // Use acorn token stream for JS; fall back for TS
  const tokens = [];
  try {
    const tokenizer = acorn.tokenizer(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });
    for (const tok of tokenizer) {
      if (tok.type.label === "eof") break;
      tokens.push({ value: String(tok.value ?? tok.type.label), line: tok.loc.start.line });
    }
  } catch {
    // Fallback: split by whitespace (less accurate but won't crash on TS syntax)
    const lines = source.split("\n");
    lines.forEach((line, idx) => {
      for (const word of line.trim().split(/\s+/)) {
        if (word) tokens.push({ value: word, line: idx + 1 });
      }
    });
  }
  return tokens;
}

function _winnow(tokens) {
  if (tokens.length < K_GRAM_SIZE) return [];

  // Build k-gram hashes
  const kgrams = [];
  for (let i = 0; i <= tokens.length - K_GRAM_SIZE; i++) {
    const gram = tokens.slice(i, i + K_GRAM_SIZE).map((t) => t.value).join("\x00");
    const hash = _hash(gram);
    kgrams.push({ hash, lineStart: tokens[i].line, lineEnd: tokens[i + K_GRAM_SIZE - 1].line });
  }

  // Winnowing window
  const fps = [];
  let prevMinIdx = -1;
  for (let i = 0; i <= kgrams.length - WINDOW_SIZE; i++) {
    const window = kgrams.slice(i, i + WINDOW_SIZE);
    const minEntry = window.reduce((min, cur) => (cur.hash < min.hash ? cur : min));
    const minIdx = i + window.findIndex((e) => e.hash === minEntry.hash);
    if (minIdx !== prevMinIdx) {
      fps.push(minEntry);
      prevMinIdx = minIdx;
    }
  }

  return fps;
}

function _hash(s) {
  return parseInt(crypto.createHash("md5").update(s).digest("hex").slice(0, 8), 16);
}

function _extractSnippet(absPath, lineStart, maxLines = 3) {
  if (!absPath) return "";
  try {
    const lines = fs.readFileSync(absPath, "utf8").split("\n");
    return lines.slice(Math.max(0, lineStart - 1), lineStart - 1 + maxLines).join("\n");
  } catch {
    return "";
  }
}

module.exports = { analyzeDuplicates };
