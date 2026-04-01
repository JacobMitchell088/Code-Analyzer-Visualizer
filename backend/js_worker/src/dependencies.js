"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");

async function analyzeDependencies(files, repoRoot) {
  const internalPaths = new Set(files.map((f) => f.relPath));
  const edges = [];
  const nodeMap = new Map();

  const ensureNode = (moduleId, filePath, language, isExternal) => {
    if (!nodeMap.has(moduleId)) {
      nodeMap.set(moduleId, {
        module_id: moduleId,
        file_path: filePath || null,
        language,
        in_degree: 0,
        out_degree: 0,
        is_external: isExternal,
      });
    }
  };

  for (const file of files) {
    const fromMod = _pathToModuleId(file.relPath);
    ensureNode(fromMod, file.relPath, file.language, false);

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
      ImportDeclaration(node) {
        const toRaw = node.source.value;
        const { toMod, isExternal } = _resolveImport(toRaw, file.relPath, internalPaths);
        ensureNode(toMod, isExternal ? null : toMod + ".js", file.language, isExternal);
        edges.push({ from_module: fromMod, to_module: toMod, import_type: "import", is_external: isExternal });
      },
      CallExpression(node) {
        if (
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "Literal"
        ) {
          const toRaw = node.arguments[0].value;
          const { toMod, isExternal } = _resolveImport(toRaw, file.relPath, internalPaths);
          ensureNode(toMod, isExternal ? null : toMod, file.language, isExternal);
          edges.push({ from_module: fromMod, to_module: toMod, import_type: "require", is_external: isExternal });
        }
      },
      // Dynamic import()
      ImportExpression(node) {
        if (node.source && node.source.type === "Literal") {
          const toRaw = node.source.value;
          const { toMod, isExternal } = _resolveImport(toRaw, file.relPath, internalPaths);
          ensureNode(toMod, null, file.language, isExternal);
          edges.push({ from_module: fromMod, to_module: toMod, import_type: "dynamic_import", is_external: isExternal });
        }
      },
    });
  }

  // Compute degrees
  for (const edge of edges) {
    if (nodeMap.has(edge.from_module)) nodeMap.get(edge.from_module).out_degree++;
    if (nodeMap.has(edge.to_module)) nodeMap.get(edge.to_module).in_degree++;
  }

  return { nodes: [...nodeMap.values()], edges };
}

function _pathToModuleId(relPath) {
  return relPath.replace(/\.(js|jsx|ts|tsx)$/, "").replace(/\\/g, "/");
}

function _resolveImport(importPath, fromRelPath, internalPaths) {
  // External package
  if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
    return { toMod: importPath.split("/")[0], isExternal: true };
  }

  // Relative import
  const fromDir = path.dirname(fromRelPath);
  const resolved = path.join(fromDir, importPath).replace(/\\/g, "/");
  const withoutExt = resolved.replace(/\.(js|jsx|ts|tsx)$/, "");

  return { toMod: withoutExt, isExternal: false };
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

module.exports = { analyzeDependencies };
