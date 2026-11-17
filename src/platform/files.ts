import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Linking, Platform } from "react-native";

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

/** Open a file whose URL is fetched after the user taps its link. */
export async function openFileUrl(resolveUrl: () => Promise<string>) {
  if (Platform.OS !== "web") {
    await Linking.openURL(await resolveUrl());
    return true;
  }

  // A signed URL can arrive after the browser's user activation has expired.
  const tab = window.open("about:blank", "_blank");
  if (!tab) return false;
  try {
    tab.opener = null;
    const url = await resolveUrl();
    if (!tab.closed) tab.location.replace(url);
    return true;
  } catch (error) {
    tab.close();
    throw error;
  }
}

const extensionMimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  gif: "image/gif",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
};

export function inferPickedFileMimeType(
  name: string,
  mimeType?: string | null,
): string {
  const normalized = mimeType?.trim();
  if (normalized && normalized !== "application/octet-stream") return normalized;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return extensionMimeTypes[ext] || normalized || "application/octet-stream";
}

export async function chooseFiles(
  type: string | string[] = "*/*",
  multiple = false,
): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type,
    multiple,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    type: inferPickedFileMimeType(asset.name, asset.mimeType),
    size: asset.size || 0,
    arrayBuffer: () =>
      Platform.OS === "web" && asset.file
        ? asset.file.arrayBuffer()
        : new File(asset.uri).arrayBuffer(),
  }));
}
// Supabase recommends ArrayBuffer for React Native Storage uploads. Preserve
// the web file metadata that existing validation and submission services use.
export async function asServiceFile(
  file: PickedFile,
): Promise<globalThis.File> {
  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength)
    throw new Error(
      "The selected file is empty, too large, or changed. Verify the original file.",
    );
  const resolvedType = inferPickedFileMimeType(file.name, file.type);
  if (Platform.OS === "web")
    return new globalThis.File([bytes], file.name, { type: resolvedType });
  Object.assign(bytes, {
    name: file.name,
    type: resolvedType,
    size: bytes.byteLength,
    uri: file.uri,
    arrayBuffer: async () => bytes,
  });
  return bytes as unknown as globalThis.File;
}
