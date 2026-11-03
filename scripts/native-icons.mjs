import fs from "node:fs";
import path from "node:path";
const root = path.resolve("src/app");
const exports = fs.readFileSync(
  "node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs",
  "utf8",
);
const aliases = new Map(
  [
    ...exports.matchAll(
      /export\s*\{([^}]+)\}\s*from\s*['"]\.\/icons\/([^'"]+)\.mjs['"]/g,
    ),
  ].flatMap((match) =>
    [...match[1].matchAll(/default as (\w+)/g)].map((alias) => [
      alias[1],
      match[2],
    ]),
  ),
);
function iconImport(name, binding = name) {
  const actual =
    aliases.get(name) ||
    name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  if (
    !fs.existsSync(
      path.resolve(
        "node_modules/lucide-react-native/dist/esm/icons/" + actual + ".mjs",
      ),
    )
  )
    throw new Error("Review runtime icon export " + name);
  return `import ${binding} from 'lucide-react-native/icons/${actual}';`;
}
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!file.endsWith(".tsx")) continue;
    const before = fs.readFileSync(file, "utf8");
    const value = before
      .replace(
        /import\s*\{([^}]+)\}\s*from\s*["']lucide-react-native["'];?/g,
        (_whole, names) =>
          names
            .split(",")
            .filter((part) => part.trim())
            .map((part) => {
              const [name, alias] = part.trim().split(/\s+as\s+/);
              return iconImport(name, alias || name);
            })
            .join("\n"),
      )
      .replace(
        /import\s+(\w+)\s+from\s*['"]lucide-react-native\/icons\/([^'"]+)['"];?/g,
        (whole, name, actual) => {
          if (
            fs.existsSync(
              path.resolve(
                "node_modules/lucide-react-native/dist/esm/icons/" +
                  actual +
                  ".mjs",
              ),
            )
          )
            return whole;
          return iconImport(name);
        },
      );
    if (value !== before) fs.writeFileSync(file, value);
  }
}
visit(root);
