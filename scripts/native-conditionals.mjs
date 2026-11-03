import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
let count = 0;
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!file.endsWith(".tsx")) continue;
    let source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      ),
      edits = [];
    function walk(node) {
      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        (!node.parent || !ts.isJsxAttribute(node.parent))
      ) {
        const expression = node.expression;
        if (
          ts.isBinaryExpression(expression) &&
          expression.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken
        ) {
          const left = expression.left;
          if (
            !ts.isPrefixUnaryExpression(left) ||
            left.operator !== ts.SyntaxKind.ExclamationToken
          )
            edits.push({
              from: left.getStart(ast),
              to: left.end,
              value: `!!(${left.getText(ast)})`,
            });
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
    for (const edit of edits.sort((a, b) => b.from - a.from))
      source = source.slice(0, edit.from) + edit.value + source.slice(edit.to);
    if (edits.length) {
      fs.writeFileSync(file, source);
      count += edits.length;
    }
  }
}
visit(path.resolve("src/app"));
console.log(
  `Normalized ${count} native render guards so empty strings and zero cannot become View text children.`,
);
