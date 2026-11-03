import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { File, Paths } from "expo-file-system";
import {
  readingOrderText,
  budgetTableText,
  workTableText,
  type PdfTextPiece,
  type PdfRule,
} from "../core/web/app/features/proposal-import/services/pdfLayout";
export type NativePdf = { uri: string; name: string; size: number };
const native = requireOptionalNativeModule<{
  extractText: (uri: string) => Promise<string>;
  extractLayout: (
    uri: string,
  ) => Promise<{ items: PdfTextPiece[]; rules: PdfRule[] }[]>;
}>("EFlowPdf");
const cached = (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid import identity.");
  return new File(Paths.document, "eflow-import-" + id + ".pdf");
};
export async function cacheImportFile(id: string, file: NativePdf) {
  const destination = cached(id);
  if (destination.exists) destination.delete();
  new File(file.uri).copy(destination);
}
export async function readImportFile(
  id: string,
): Promise<NativePdf | undefined> {
  const file = cached(id);
  return file.exists
    ? { uri: file.uri, name: file.name, size: file.size }
    : undefined;
}
export async function clearImportFile(id: string) {
  const file = cached(id);
  if (file.exists) file.delete();
}
export async function readProjectDocument(file: NativePdf) {
  if (Platform.OS === "web" || !native)
    throw new Error(
      "Native PDF import requires a current Android or iOS build.",
    );
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose a PDF up to 20 MB.");
  const pages = await native.extractLayout(file.uri);
  const text = pages
    .map((page, index) => {
      const budget = budgetTableText(page.items, page.rules, index + 1),
        work = workTableText(page.items, page.rules);
      const labels = ["Category", "Particulars", "Amount", "Subtotal"];
      if (
        !budget &&
        labels.every((label) =>
          page.items.some(
            (item) => item.str.trim().toLowerCase() === label.toLowerCase(),
          ),
        )
      )
        throw new Error(
          "The native PDF budget table could not be read safely. Review a text-based PDF before importing.",
        );
      return readingOrderText(page.items) + budget + work;
    })
    .join("\n\n")
    .replace(/\x00/g, "");
  if (
    /total\s+project\s+cost/i.test(text) &&
    !text.includes("[PDF BUDGET TABLE PAGE ")
  )
    throw new Error(
      "The source project budget needs a readable ruled table. Its financial values were not imported.",
    );
  if (text.trim().split(/\s+/).length < 20)
    throw new Error(
      "This PDF has too little readable text. Use a PDF with selectable text; scanned pages require OCR first.",
    );
  if (text.length > 500000)
    throw new Error("Import the document in smaller sections.");
  return text;
}
