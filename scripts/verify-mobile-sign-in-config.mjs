import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { loadProjectEnv } from "@expo/env";

// Use the same production dotenv resolution as Expo, without printing key values.
loadProjectEnv(process.cwd(), { mode: "production", silent: true, force: true });
const source = fs.readFileSync(path.resolve("src/platform/config.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {}, process: { env: process.env } };
vm.runInNewContext(outputText, context, { timeout: 1000 });
const { backendConfig, configurationError } = context.exports;
if (configurationError) throw new Error(configurationError);
if (!backendConfig.mobileSignIn) {
  throw new Error("Phone release requires hosted secure sign-in. A gateway QA override is active.");
}
console.log("Phone sign-in configuration verified: protected Supabase endpoint, approved project, no gateway fallback.");
