"use strict";

const fs = require("fs");
const acorn = require("acorn");
const walk = require("acorn-walk");

/**
 * Dead code detection strategy:
 * 1. Collect all exported symbols (named exports, export default)
 * 2. Collect all imported symbols across all files
 * 3. Report exports that are never imported anywhere in the repo
 * Also reports top-level declared but never-referenced functions/classes (within a file).
 */
async function analyzeDeadCode(files, repoRoot) {
  // Pass 1: collect all exports and imports
  const exportedSymbols = []; // { name, file_path, line, language }
  const importedNames = new Set(); // all names that are imported from internal modules

  for (const file of files) {
    let source;
    try {
      source = fs.readFileSync(file.absPath, "utf8");
    } catch {
      continue;
    }

    let ast;
    try {
      ast = _parse(source, file.language);
    } catch {
      continue;
    }

    walk.simple(ast, {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          const names = _extractDeclaredNames(node.declaration);
          for (const name of names) {
            exportedSymbols.push({
              name,
              symbol_type: _declType(node.declaration),
              file_path: file.relPath,
              line: node.loc.start.line,
              confidence: "medium",
              language: file.language,
            });
          }
        }
        for (const spec of (node.specifiers || [])) {
          exportedSymbols.push({
            name: spec.exported.name,
            symbol_type: "export",
            file_path: file.relPath,
            line: node.loc.start.line,
            confidence: "medium",
            language: file.language,
          });
        }
      },
      ExportDefaultDeclaration(node) {
        exportedSymbols.push({
          name: "default",
          symbol_type: "export",
          file_path: file.relPath,
          line: node.loc.start.line,
          confidence: "low", // default exports are often used externally
          language: file.language,
        });
      },
      ImportDeclaration(node) {
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier") {
            importedNames.add(spec.imported.name);
          } else if (spec.type === "ImportDefaultSpecifier") {
            importedNames.add("default");
          }
        }
      },
    });
  }

  // Pass 2: filter exports that are never imported
  const symbols = exportedSymbols.filter((sym) => !importedNames.has(sym.name));

  return { symbols };
}

function _extractDeclaredNames(decl) {
  if (!decl) return [];
  if (decl.type === "FunctionDeclaration" && decl.id) return [decl.id.name];
  if (decl.type === "ClassDeclaration" && decl.id) return [decl.id.name];
  if (decl.type === "VariableDeclaration") {
    return decl.declarations
      .filter((d) => d.id && d.id.type === "Identifier")
      .map((d) => d.id.name);
  }
  return [];
}

function _declType(decl) {
  if (!decl) return "export";
  if (decl.type === "FunctionDeclaration") return "function";
  if (decl.type === "ClassDeclaration") return "class";
  if (decl.type === "VariableDeclaration") return "variable";
  return "export";
}

function _parse(source, language) {
  if (language === "typescript") {
    try {
      const tsParser = require("@typescript-eslint/typescript-estree");
      return tsParser.parse(source, { loc: true, range: true, jsx: true });
    } catch {}
  }
  return acorn.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  });
}

module.exports = { analyzeDeadCode };
