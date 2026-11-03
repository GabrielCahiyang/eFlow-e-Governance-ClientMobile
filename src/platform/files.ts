import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Platform } from "react-native";

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
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
    type: asset.mimeType || "application/octet-stream",
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
  if (Platform.OS === "web")
    return new globalThis.File([bytes], file.name, { type: file.type });
  Object.assign(bytes, {
    name: file.name,
    type: file.type,
    size: bytes.byteLength,
    uri: file.uri,
    arrayBuffer: async () => bytes,
  });
  return bytes as unknown as globalThis.File;
}
