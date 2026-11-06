import { colors } from "../components/ui/theme";
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { csvCell, htmlCell } from "./exportSerialization";
export { csvCell, htmlCell } from "./exportSerialization";
export async function exportTable(
  format: "csv" | "pdf",
  title: string,
  columns: string[],
  rows: unknown[][],
) {
  const csv =
    "\uFEFF" +
    [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const html = `<html><head><meta charset="utf-8"><style>body{font:12px sans-serif;color:${colors.text}}table{border-collapse:collapse;width:100%}td,th{border:1px solid ${colors.border};padding:8px;text-align:left;overflow-wrap:anywhere}th{background:${colors.primarySoft}}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>${htmlCell(title)}</h1><p>Exported ${htmlCell(new Date().toISOString())} · Authorized records only</p><table><thead><tr>${columns.map((c) => `<th>${htmlCell(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${htmlCell(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
  if (Platform.OS === "web") {
    if (format === "pdf") {
      await Print.printAsync({ html });
      return;
    }
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "eFlow-export.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  let file: File | undefined;
  try {
    file =
      format === "pdf"
        ? new File((await Print.printToFileAsync({ html })).uri)
        : new File(Paths.cache, `eflow-${Date.now()}.csv`);
    if (format === "csv") file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: format === "csv" ? "text/csv" : "application/pdf",
      dialogTitle: title,
    });
  } finally {
    if (file?.exists) file.delete();
  }
}
