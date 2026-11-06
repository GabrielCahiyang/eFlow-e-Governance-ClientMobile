import { colors } from "../../components/ui/theme";
import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
export const reportColumns = [
  ["Work item", "title"],
  ["Parent / transition", "parent"],
  ["Person", "person"],
  ["Role", "role"],
  ["Project", "project"],
  ["Status", "status"],
  ["Priority / severity", "priority"],
  ["Progress", "progress"],
  ["Signal", "metric"],
  ["Event date", "eventAt"],
  ["Due date", "dueAt"],
  ["Detail", "detail"],
] as const;
export function reportValue(
  row: DepartmentReportRow,
  key: (typeof reportColumns)[number][1],
) {
  const value = row[key];
  if (value === undefined || value === null) return "—";
  if (key === "progress") return `${value}%`;
  if (key === "eventAt" || key === "dueAt")
    return new Date(Number(value)).toLocaleString();
  return String(value);
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function reportCsv(
  rows: DepartmentReportRow[],
  title: string,
  scope: string,
) {
  return (
    "\uFEFF" +
    [
      [title],
      [scope],
      [`${rows.length} visible rows`],
      [],
      reportColumns.map(([label]) => label),
      ...rows.map((row) =>
        reportColumns.map(([, key]) => reportValue(row, key)),
      ),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function escapeReportHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function reportHtml(
  rows: DepartmentReportRow[],
  title: string,
  scope: string,
) {
  const e = escapeReportHtml;
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:16mm}body{font:10px sans-serif;color:${colors.text}}h1{font-size:22px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:6px;text-align:left;border:1px solid ${colors.border};overflow-wrap:anywhere}th{background:${colors.primarySoft}}tr{break-inside:avoid}</style></head><body><h1>eFlow · ${e(title)}</h1><p>${e(scope)} · ${rows.length} visible rows</p><table><thead><tr>${reportColumns.map(([label]) => `<th>${e(label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${reportColumns.map(([, key]) => `<td>${e(reportValue(row, key))}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}
