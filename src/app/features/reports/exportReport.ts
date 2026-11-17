import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
import { reportCsv, reportHtml } from "./exportData";
export async function exportNativeReport(
  format: "csv" | "pdf",
  rows: DepartmentReportRow[],
  title: string,
  scope: string,
  delivery: "share" | "save" = "share",
) {
  if (Platform.OS === "web") {
    if (format === "pdf") {
      await Print.printAsync({ html: reportHtml(rows, title, scope) });
      return delivery === "save"
        ? "Open the saved PDF in your browser or a PDF viewer."
        : undefined;
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
    return delivery === "save"
      ? "Open eFlow-report.csv from your downloads in Excel, Numbers, or Google Sheets."
      : undefined;
  }
  const directory =
    delivery === "save" ? await chooseReportFolder() : undefined;
  if (delivery === "save" && !directory) return;
  if (delivery === "share" && !(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const name = `eFlow-${directory ? "Office-Analytics" : "report"}-${Date.now()}.${format}`;
  let file: File | undefined;
  try {
    if (format === "csv") {
      file = new File(Paths.cache, name);
      file.write(reportCsv(rows, title, scope));
    } else {
      file = new File(
        (await Print.printToFileAsync({ html: reportHtml(rows, title, scope) }))
          .uri,
      );
    }
    if (directory) {
      if (format === "pdf") file.rename(name);
      await file.copy(directory);
      const viewer =
        format === "csv"
          ? "Excel, Numbers, or Google Sheets"
          : "a PDF viewer such as Adobe Acrobat";
      return `Open ${name} from the folder you chose using ${viewer}.`;
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

async function chooseReportFolder() {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (
      code === "ERR_PICKER_CANCELLED" ||
      code === "ERR_FILE_PICKING_CANCELLED"
    )
      return;
    throw error;
  }
}
