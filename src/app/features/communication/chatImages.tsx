import { useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { supabase } from "../../../platform/supabase";
import type { PickedFile } from "../../../platform/files";
import { useFacts } from "../../shared/useFacts";
import { ErrorState } from "../../components/ui";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
const bucket = "conversation-images";
export const chatImageTypes = Object.keys(extensions);

export async function uploadChatImage(
  channel: string,
  actor: string,
  file: PickedFile,
) {
  const extension = extensions[file.type];
  if (!extension) throw new Error("Choose a JPG, PNG, GIF or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image up to 10 MB.");
  const bytes = await file.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024)
    throw new Error("Choose an image up to 10 MB.");
  const path = `${channel}/${actor}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return path;
}

export function ChatImage({
  actor,
  path,
  style,
  resizeMode = "contain",
}: {
  actor: string;
  path: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: "contain" | "cover";
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const image = useFacts(`chat-image:${actor}:${path}`, async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  });
  if (image.error || (!!failedUrl && failedUrl === image.data))
    return (
      <ErrorState
        error="Image unavailable"
        retry={() => {
          setFailedUrl(undefined);
          void image.refresh();
        }}
      />
    );
  return image.data ? (
    <Image
      accessibilityLabel="Image attachment"
      source={{ uri: image.data }}
      resizeMode={resizeMode}
      style={[{ width: "100%", height: 200, borderRadius: 12 }, style]}
      onError={() => setFailedUrl(image.data)}
    />
  ) : null;
}
