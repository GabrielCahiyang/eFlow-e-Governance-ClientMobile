import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript');
const templatePath = path.join(root, 'scripts/native-core/subtaskWorkUpdate.ts');

// Replace only the direct-update declarations. Preserve native Inspector/review
// adaptations and all other writers, including during a targeted refresh.
export function adaptSubtaskWorkUpdate(source) {
  const ast = ts.createSourceFile('subtaskWorkflowService.ts', source, ts.ScriptTarget.Latest, true);
  const writer = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'saveSubtaskWorkUpdate');
  const upload = ast.statements.find(node => ts.isFunctionDeclaration(node) && ['uploadFile', 'uploadSubtaskWorkFile'].includes(node.name?.text));
  if (!writer || !upload) throw new Error('Subtask direct-update/upload declarations changed; review adaptation.');
  const replacement = '// BEGIN native direct-subtask evidence retention\n' +
    fs.readFileSync(templatePath, 'utf8').replaceAll('await uploadFile(', `await ${upload.name.text}(`).trim() +
    '\n// END native direct-subtask evidence retention';
  const marked = /\/\/ BEGIN native direct-subtask evidence retention[\s\S]*?\/\/ END native direct-subtask evidence retention/;
  if (marked.test(source)) return source.replace(marked, () => replacement);
  let adapted = source;
  const declarations = ast.statements.filter(node =>
    node === writer || (ts.isClassDeclaration(node) && node.name?.text === 'SubtaskWorkUpdateRejectedError'));
  for (const node of [...declarations].reverse()) {
    adapted = adapted.slice(0, node.getStart(ast)) + (node === writer ? replacement.trim() : '') + adapted.slice(node.end);
  }
  if (!ast.statements.some(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === '../../../shared/MutationRejectedError')) {
    adapted = "import { MutationRejectedError } from '../../../shared/MutationRejectedError';\n" + adapted;
  }
  return adapted;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const file = path.join(root, 'src/core/web/app/features/subtasks/services/subtaskWorkflowService.ts');
  fs.writeFileSync(file, adaptSubtaskWorkUpdate(fs.readFileSync(file, 'utf8')));
  console.log('Applied scoped direct-subtask evidence retention adaptation.');
}
