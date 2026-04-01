"use strict";

const fs = require("fs");
const acorn = require("acorn");
const walk = require("acorn-walk");

// Nodes that increment cyclomatic complexity
const CC_NODE_TYPES = new Set([
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "CatchClause",
  "SwitchCase",
  "ConditionalExpression",
  "LogicalExpression",  // && and ||
]);

/**
 * Compute cyclomatic complexity for all functions in a file.
 */
function complexityForFile(absPath, relPath, language) {
  let source;
  try {
    source = fs.readFileSync(absPath, "utf8");
  } catch {
    return [];
  }

  let ast;
  try {
    ast = _parse(source, language);
  } catch {
    return [];
  }

  const functions = [];
  const lines = source.split("\n");

  const visitors = {
    Function(node) {
      const name = _functionName(node);
      const cc = _computeCC(node);
      functions.push({
        function_name: name,
        file_path: relPath,
        line_start: node.loc.start.line,
        line_end: node.loc.end.line,
        complexity: cc,
        rank: _rank(cc),
        language,
      });
    },
  };

  // acorn-walk uses "Function" to match FunctionDeclaration, FunctionExpression, ArrowFunctionExpression
  walk.simple(ast, visitors);

  return functions;
}

function _computeCC(funcNode) {
  let cc = 1; // base complexity
  walk.simple(funcNode, {
    IfStatement() { cc++; },
    ForStatement() { cc++; },
    ForInStatement() { cc++; },
    ForOfStatement() { cc++; },
    WhileStatement() { cc++; },
    DoWhileStatement() { cc++; },
    CatchClause() { cc++; },
    SwitchCase(node) { if (node.test !== null) cc++; }, // skip default:
    ConditionalExpression() { cc++; },
    LogicalExpression(node) {
      if (node.operator === "&&" || node.operator === "||") cc++;
    },
  });
  return cc;
}

function _functionName(node) {
  if (node.type === "FunctionDeclaration" && node.id) return node.id.name;
  if (node.type === "FunctionExpression" && node.id) return node.id.name;
  // Arrow function or anonymous — try parent assignment (best effort)
  return "(anonymous)";
}

function _rank(cc) {
  if (cc <= 5) return "A";
  if (cc <= 10) return "B";
  if (cc <= 15) return "C";
  if (cc <= 20) return "D";
  if (cc <= 25) return "E";
  return "F";
}

function _parse(source, language) {
  if (language === "typescript") {
    // Try @typescript-eslint/typescript-estree
    try {
      const tsParser = require("@typescript-eslint/typescript-estree");
      return tsParser.parse(source, { loc: true, range: true, jsx: true });
    } catch {
      // Fall through to acorn with jsx disabled
    }
  }
  return acorn.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
  });
}

async function analyzeComplexity(files, repoRoot) {
  const functions = [];
  const perFileMap = new Map();

  for (const file of files) {
    const funcs = complexityForFile(file.absPath, file.relPath, file.language);
    functions.push(...funcs);

    if (funcs.length > 0) {
      const scores = funcs.map((f) => f.complexity);
      perFileMap.set(file.relPath, {
        file_path: file.relPath,
        max_complexity: Math.max(...scores),
        avg_complexity: scores.reduce((a, b) => a + b, 0) / scores.length,
        lines_of_code: _countLines(file.absPath),
      });
    }
  }

  return { functions, per_file: [...perFileMap.values()] };
}

function _countLines(absPath) {
  try {
    const content = fs.readFileSync(absPath, "utf8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

module.exports = { analyzeComplexity };
