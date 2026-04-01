"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([
  ".git", "node_modules", "__pycache__", "dist", "build",
  ".next", ".nuxt", "vendor", "target", "coverage",
]);

const LANGUAGE_MAP = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
};

/**
 * @typedef {{ absPath: string, relPath: string, language: string }} FileInfo
 */

/**
 * @param {string} root
 * @returns {FileInfo[]}
 */
function walkFiles(root) {
  const results = [];
  _walk(root, root, results);
  return results;
}

function _walk(root, dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      _walk(root, absPath, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const language = LANGUAGE_MAP[ext];
      if (language) {
        results.push({
          absPath,
          relPath: path.relative(root, absPath).replace(/\\/g, "/"),
          language,
        });
      }
    }
  }
}

module.exports = { walkFiles };
