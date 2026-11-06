import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Appearance, StyleSheet, type StyleProp } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, darkColors } from "./theme";
export type AppearancePreference = "system" | "light" | "dark";
const dark = darkColors;
const Context = createContext({
  preference: "system" as AppearancePreference,
  isDark: false,
  setPreference: async (_value: AppearancePreference) => {},
});
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<AppearancePreference>("system"),
    [scheme, setScheme] = useState(Appearance.getColorScheme());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem("eflow.appearance")
      .then((value) => {
        if (active && ["system", "light", "dark"].includes(value || ""))
          setPreference(value as AppearancePreference);
      })
      .catch(() => {});
    const listener = Appearance.addChangeListener((event) =>
      setScheme(event.colorScheme),
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  const set = async (value: AppearancePreference) => {
    await AsyncStorage.setItem("eflow.appearance", value);
    setPreference(value);
  };
  return (
    <Context.Provider
      value={{
        preference,
        isDark:
          preference === "dark" ||
          (preference === "system" && scheme === "dark"),
        setPreference: set,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAppearance = () => useContext(Context);
/** New native controls resolve semantic tokens explicitly; legacy screens retain their adapter. */
export const useTheme = () => (useAppearance().isDark ? darkColors : colors);
export function themedStyle<T>(
  style: StyleProp<T>,
  isDark: boolean,
): StyleProp<T> {
  if (!isDark) return style;
  const flat: any = StyleSheet.flatten(style as any);
  if (!flat) return style;
  const next = { ...flat };
  for (const key of Object.keys(next)) {
    if (!/color$/i.test(key) || typeof next[key] !== "string") continue;
    const value = next[key].toLowerCase();
    if ((value === "#fff" || value === "#ffffff") && key !== "color")
      next[key] = dark.surface;
    else {
      const token = (Object.keys(colors) as (keyof typeof colors)[]).find(
        (k) => colors[k].toLowerCase() === value,
      );
      if (
        token &&
        !(token === "surface" && key === "color") &&
        !(
          key === "backgroundColor" &&
          ["primary", "danger", "primaryDark"].includes(token)
        )
      )
        next[key] = dark[token];
    }
  }
  return next;
}
export const themeText = (style: any, isDark: boolean) => [
  { color: isDark ? dark.text : colors.text },
  themedStyle(style, isDark),
];
