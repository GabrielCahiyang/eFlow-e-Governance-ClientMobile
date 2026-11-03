import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { backendConfig } from "../../../platform/config";
import { parseNativeEntryLink, type NativeEntryLink } from "./entryLinks";
export function useNativeEntryLink() {
  const [entry, setEntry] = useState<NativeEntryLink | null>(null);
  useEffect(() => {
    let current = true;
    const receive = (url: string | null) => {
      const link = url
        ? parseNativeEntryLink(url, backendConfig.webOrigin)
        : null;
      if (current && link) setEntry(link);
    };
    void Linking.getInitialURL()
      .then(receive)
      .catch(() => {});
    const subscription = Linking.addEventListener("url", ({ url }) =>
      receive(url),
    );
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);
  return { entry, close: () => setEntry(null) };
}
