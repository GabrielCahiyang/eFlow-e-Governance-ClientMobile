import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const summary = JSON.parse(fs.readFileSync("docs/STANDALONE_V58_APK_VERIFICATION.json", "utf8"));
const sourceMap = JSON.parse(fs.readFileSync("android/app/build/generated/sourcemaps/react/release/index.android.bundle.map", "utf8"));
const files = [
  "src/app/features/budget/workFinancialClearance.ts",
  "src/app/features/budget/WorkFinancialClearancePanel.tsx",
  "src/app/features/budget/CashReturnPanel.tsx",
  "src/app/features/budget/LiquidationSheet.tsx",
  "src/app/features/budget/SettlementPanel.tsx",
  "src/app/features/budget/useCashRequestUpdates.ts",
  "src/app/features/tasks/TaskDetailsScreen.tsx",
  "src/app/features/tasks/TaskReviewPanel.tsx",
  "src/app/features/tasks/WorkTreePanel.tsx",
  "src/app/features/tasks/WorkProposalSheet.tsx",
  "src/app/features/tasks/SubtaskCompletionSheet.tsx",
  "src/app/shared/domainErrorMessages.ts",
];
summary.changedSources = files.map(file => {
  const index = sourceMap.sources.findIndex(source => source.replaceAll("\\", "/").endsWith("/" + file));
  const bytes = fs.readFileSync(file);
  if (index < 0 || sourceMap.sourcesContent[index] !== bytes.toString("utf8"))
    throw new Error("APK contains missing or stale workflow source: " + file);
  return { file, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
});
fs.writeFileSync("docs/mobile-redesign/M7-work-financial-clearance-apk-verification.json", JSON.stringify(summary, null, 2) + "\n");
const auditPath = "docs/NATIVE_RELEASE_AUDIT.json";
const previous = fs.existsSync(auditPath) ? fs.readFileSync(auditPath) : undefined;
try {
  execFileSync(process.execPath, ["scripts/verify-native-release.mjs"], {
    env: { ...process.env, EFLOW_ANDROID_APK_BUNDLE: "artifacts/embedded-android-v58.hbc" },
    stdio: "inherit",
  });
  fs.copyFileSync(auditPath, "docs/mobile-redesign/M7-work-financial-clearance-release-audit.json");
} finally {
  if (previous) fs.writeFileSync(auditPath, previous);
  else if (fs.existsSync(auditPath)) fs.unlinkSync(auditPath);
}
console.log(`Verified ${files.length} workflow sources in the non-debuggable M7 APK. Previous global credential receipt preserved.`);
