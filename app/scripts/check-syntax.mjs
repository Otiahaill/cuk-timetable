/* Local syntax + import/export sanity checker.
 * Runs on this device using the Babel parser already present in node_modules
 * (avoids the native-binary limitation that blocks tsc/vitest here).
 *
 * Usage: node scripts/check-syntax.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

const SRC_DIRS = ['src'];
const EXT = ['.ts', '.tsx'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXT.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

const files = SRC_DIRS.flatMap((d) => walk(d));
let errors = 0;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator',
        'topLevelAwait',
      ],
    });

    // Collect imported + locally-declared names
    const imported = new Set();
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration') {
        for (const s of node.specifiers) {
          imported.add(s.local.name);
        }
      }
    }

    const declared = new Set();
    for (const node of ast.program.body) {
      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        const d = node.declaration;
        if (d.id) declared.add(d.id.name);
        if (d.declarations) for (const x of d.declarations) if (x.id) declared.add(x.id.name);
      }
      if (node.type === 'ExportDefaultDeclaration') {
        if (node.declaration?.id) declared.add(node.declaration.id.name);
      }
      if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
      if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name);
      if (node.type === 'VariableDeclaration') {
        for (const x of node.declarations) {
          if (x.id?.type === 'Identifier') declared.add(x.id.name);
          if (x.id?.type === 'ObjectPattern') {
            for (const p of x.id.properties) if (p.value?.name) declared.add(p.value.name);
          }
          if (x.id?.type === 'ArrayPattern') {
            for (const p of x.id.elements) if (p?.name) declared.add(p.name);
          }
        }
      }
    }

    const unusedImports = [...imported].filter((n) => {
      if (declared.has(n)) return false;
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      return !re.test(code.slice(code.indexOf(n) + n.length));
    });

    if (unusedImports.length) {
      console.log(`⚠ ${file}: possibly unused imports -> ${unusedImports.join(', ')}`);
    }
  } catch (err) {
    errors++;
    console.log(`✗ ${file}: ${err.message}`);
  }
}

console.log(
  errors === 0
    ? `✓ ${files.length} files parsed successfully`
    : `✗ ${errors} file(s) failed to parse`
);
process.exit(errors === 0 ? 0 : 1);
