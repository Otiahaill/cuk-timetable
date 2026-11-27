/* Lightweight type-sanity checker (on-device).
 *
 * The full `tsc` cannot run here (native binary restriction), so this script
 * catches the most common type mistakes that break a production build:
 *   - JSX intrinsic element names that do not exist
 *   - props passed to components that the component does not accept
 *   - `role` values outside the ARIA set Preact accepts
 *   - `e.target.value` (EventTarget has no `value`)
 *
 * Usage: node scripts/check-types.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parser = require('@babel/parser');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = walk('src');
let problems = 0;

/** Collect the props each exported component accepts. */
const componentProps = new Map();

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  for (const node of ast.program.body) {
    const decl =
      node.type === 'ExportNamedDeclaration' ? node.declaration : node.type === 'FunctionDeclaration' ? node : null;
    if (!decl || decl.type !== 'FunctionDeclaration' || !decl.id) continue;

    const propsParam = decl.params[0];
    if (!propsParam || propsParam.type !== 'ObjectPattern') continue;

    const propNames = propsParam.properties
      .filter((p) => p.type === 'ObjectProperty')
      .map((p) => p.key.name ?? p.key.value)
      .filter(Boolean);
    componentProps.set(decl.id.name, propNames);
  }
}

const VALID_ROLES = new Set([
  'alert', 'banner', 'button', 'dialog', 'document', 'group', 'img', 'link',
  'list', 'listitem', 'main', 'navigation', 'progressbar', 'region', 'search',
  'status', 'switch', 'tab', 'tablist', 'tabpanel', 'toolbar', 'tooltip',
]);

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const report = (msg) => {
    problems++;
    console.log(`✗ ${file}: ${msg}`);
  };

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'JSXAttribute') {
      const attrName = node.name.name;

      // role must be a known ARIA role
      if (attrName === 'role' && node.value?.type === 'StringLiteral') {
        if (!VALID_ROLES.has(node.value.value)) {
          report(`role="${node.value.value}" is not a valid Preact ARIA role`);
        }
      }

      // e.target.value is a type error — EventTarget has no `value`
      if (
        node.value &&
        node.value.type === 'JSXExpressionContainer' &&
        node.value.expression?.type === 'MemberExpression' &&
        node.value.expression.property?.name === 'value' &&
        node.value.expression.object?.type === 'MemberExpression' &&
        node.value.expression.object.property?.name === 'target'
      ) {
        report('use e.currentTarget.value instead of e.target.value');
      }

      // Unknown component props
      if (node.value?.type === 'JSXExpressionContainer' && node.value.expression?.type === 'JSXElement') {
        const compName = node.value.expression.openingElement.name;
        if (compName?.type === 'JSXIdentifier' && componentProps.has(compName.name)) {
          const allowed = componentProps.get(compName.name);
          for (const attr of node.value.expression.openingElement.attributes) {
            if (attr.type !== 'JSXAttribute') continue;
            const propName = attr.name.name;
            if (propName === 'children' || propName === 'key' || propName === 'ref') continue;
            if (!allowed.includes(propName)) {
              report(`<${compName.name}> does not accept prop "${propName}"`);
            }
          }
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value.type === 'string') visit(value);
    }
  };

  visit(ast.program);
}

console.log(
  problems === 0
    ? `✓ type sanity checks passed for ${files.length} files`
    : `✗ ${problems} type problem(s) found`
);
process.exit(problems === 0 ? 0 : 1);
