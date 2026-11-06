import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { File } from "expo-file-system";
import type { PickedFile } from "./files";

export async function captureEvidencePhoto(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Allow camera access in device settings, or choose a file instead.",
    );
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    exif: false,
  });
  if (result.canceled) return [];
  const asset = result.assets[0];
  const file = new File(asset.uri);
  return [
    {
      uri: asset.uri,
      name: asset.fileName || file.name,
      type: asset.mimeType || file.type || "application/octet-stream",
      size: asset.fileSize || file.size,
      arrayBuffer: () => file.arrayBuffer(),
    },
  ];
}

export type EvidenceFile = Omit<PickedFile, "arrayBuffer">;
export async function readEvidenceFile(file: EvidenceFile) {
  if (Platform.OS === "web") return (await fetch(file.uri)).arrayBuffer();
  return new File(file.uri).arrayBuffer();
}
