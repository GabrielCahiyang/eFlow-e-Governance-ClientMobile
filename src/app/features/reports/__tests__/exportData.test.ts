import { test, expect } from "@jest/globals";
import { reportCsv, reportHtml, csvCell } from "../exportData";
import type { DepartmentReportRow } from "../../../../core/web/app/features/reports/types";
const row: DepartmentReportRow = {
  id: "one",
  kind: "operations",
  title: '<script>alert("x")</script>',
  parent: "Parent",
  project: "Office project",
  person: "Person",
  role: "Lead",
  status: "completed",
  priority: "high",
  progress: 100,
  metric: "=SUM(1,2)",
  detail: 'Two lines\nwith "quotes"',
};
test("CSV preserves the complete filtered row and escapes spreadsheet formulas, commas and quotes", () => {
  const csv = reportCsv([row], "Filtered report", "Office · Person: One");
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Signal"');
  expect(csv).toContain('"\'=SUM(1,2)"');
  expect(csv).toContain('"Two lines\nwith ""quotes"""');
  expect(csvCell("  @SUM(A1)")).toBe('"\'  @SUM(A1)"');
  expect(csv).toContain('"100%"');
});
test("PDF HTML renders untrusted report text as text, including filter and title strings", () => {
  const html = reportHtml([row], "<h1>Title</h1>", "<img src=x>");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("&lt;h1&gt;Title&lt;/h1&gt;");
  expect(html).toContain("1 visible rows");
  expect(html).toContain("Office project");
});
