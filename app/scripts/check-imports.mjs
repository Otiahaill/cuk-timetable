/* Local import/export cross-check.
 * Verifies that every named import from a local module is actually exported
 * by that module — the most common cause of "build fails, blank screen" bugs.
 *
 * Usage: node scripts/check-imports.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (['.ts', '.tsx'].includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const files = walk('src');
const exportMap = new Map(); // resolved path -> Set of exported names
const importRecords = [];

function parse(file) {
  return parser.parse(fs.readFileSync(file, 'utf8'), {
    sourceType: 'module',
    plugins: ['typescript', 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator'],
  });
}

function resolveLocal(fromFile, spec) {
  let target = path.resolve(path.dirname(fromFile), spec);
  const candidates = [target, `${target}.ts`, `${target}.tsx`, path.join(target, 'index.ts')];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

for (const file of files) {
  const ast = parse(file);
  const names = new Set();

  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        const d = node.declaration;
        if (d.id) names.add(d.id.name);
        if (d.declarations) for (const x of d.declarations) if (x.id) names.add(x.id.name);
      }
      for (const spec of node.specifiers ?? []) {
        const exported = spec.exported;
        names.add(exported.name ?? exported.value);
      }
    }
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type === 'ExportAllDeclaration') names.add('*');
  }

  exportMap.set(path.resolve(file), names);

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration') continue;
    if (!node.source.value.startsWith('.')) continue;
    const target = resolveLocal(file, node.source.value);
    if (!target) continue;
    const wanted = node.specifiers
      .filter((s) => s.type === 'ImportSpecifier')
      .map((s) => s.imported.name ?? s.imported.value);
    importRecords.push({ file, target, wanted, source: node.source.value });
  }
}

let problems = 0;
for (const rec of importRecords) {
  const available = exportMap.get(path.resolve(rec.target));
  if (!available) continue;
  if (available.has('*')) continue;
  for (const name of rec.wanted) {
    if (!available.has(name)) {
      problems++;
      console.log(
        `✗ ${rec.file} imports { ${name} } from '${rec.source}' — not exported there`
      );
    }
  }
}

console.log(
  problems === 0
    ? `✓ ${importRecords.length} local import statements verified`
    : `✗ ${problems} broken import(s)`
);
process.exit(problems === 0 ? 0 : 1);
