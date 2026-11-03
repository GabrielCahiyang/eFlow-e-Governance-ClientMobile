import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, AppState } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const Context = createContext({ reduced: true, active: true });
export function MotionProvider({
  children,
  reduceMotion,
}: {
  children: ReactNode;
  reduceMotion?: boolean;
}) {
  const initial = useReducedMotion();
  const [reduced, setReduced] = useState(initial);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (current) setReduced(value);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const state = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => {
      current = false;
      motion.remove();
      state.remove();
    };
  }, []);
  return (
    <Context.Provider value={{ reduced: reduceMotion ?? reduced, active }}>
      {children}
    </Context.Provider>
  );
}
export const useMotionPreferences = () => useContext(Context);
