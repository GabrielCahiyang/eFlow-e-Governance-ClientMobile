import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
import { reportCsv, reportHtml } from "./exportData";
export async function exportNativeReport(
  format: "csv" | "pdf",
  rows: DepartmentReportRow[],
  title: string,
  scope: string,
) {
  if (Platform.OS === "web") {
    if (format === "pdf") {
      await Print.printAsync({ html: reportHtml(rows, title, scope) });
      return;
    }
    const url = URL.createObjectURL(
        new Blob([reportCsv(rows, title, scope)], {
          type: "text/csv;charset=utf-8",
        }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = "eFlow-report.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  let file: File | undefined;
  try {
    if (format === "csv") {
      file = new File(Paths.cache, `eFlow-report-${Date.now()}.csv`);
      file.write(reportCsv(rows, title, scope));
    } else {
      file = new File(
        (await Print.printToFileAsync({ html: reportHtml(rows, title, scope) }))
          .uri,
      );
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: format === "csv" ? "text/csv" : "application/pdf",
      dialogTitle: title,
      UTI:
        format === "csv"
          ? "public.comma-separated-values-text"
          : "com.adobe.pdf",
    });
  } finally {
    if (file?.exists) file.delete();
  }
}
