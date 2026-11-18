import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { adaptSubtaskWorkUpdate } from './adapt-native-subtask-work-update.mjs';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript');
const relative = 'src/core/web/app/features/subtasks/services/subtaskWorkflowService.ts';
const native = fs.readFileSync(path.join(root, relative), 'utf8');
assert.equal(adaptSubtaskWorkUpdate(native), native, 'Native output must match the durable adaptation.');

if (!process.env.EFLOW_WEB_SOURCE) throw new Error('Set EFLOW_WEB_SOURCE to the reviewed Web checkout.');
const web = fs.readFileSync(path.join(process.env.EFLOW_WEB_SOURCE, relative.replace('src/core/web/', 'src/')), 'utf8');
const adapted = adaptSubtaskWorkUpdate(web);
assert.equal(adaptSubtaskWorkUpdate(adapted), adapted, 'Adaptation must be idempotent after a Web refresh.');
assert.ok(adapted.includes("await uploadSubtaskWorkFile(input.subtaskId, 'progress'"));

const otherDeclarations = source => {
  const ast = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
  return ast.statements.filter(node => {
    if (['saveSubtaskWorkUpdate', 'SubtaskWorkUpdateRejectedError'].includes(node.name?.text)) return false;
    return !(ts.isImportDeclaration(node) && node.moduleSpecifier.text === '../../../shared/MutationRejectedError');
  }).map(node => node.getText(ast));
};
assert.deepEqual(otherDeclarations(adapted), otherDeclarations(web), 'Other Web declarations must be preserved.');
// Exercise the older Mobile upload helper and its native Inspector/review additions.
const unadaptedNative = native.replace(/\/\/ BEGIN native direct-subtask evidence retention[\s\S]*?\/\/ END native direct-subtask evidence retention/,
  'export async function saveSubtaskWorkUpdate() {}');
const reappliedNative = adaptSubtaskWorkUpdate(unadaptedNative);
assert.deepEqual(otherDeclarations(reappliedNative), otherDeclarations(native));
assert.equal(adaptSubtaskWorkUpdate(reappliedNative), reappliedNative);
console.log('PASS: native output, Web refresh, both upload helper names, idempotence, and unrelated declarations.');
