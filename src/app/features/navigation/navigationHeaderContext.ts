import { createContext, useContext } from "react";

export type NavigationHeaderState = {
  onBack: () => void;
  backHint: string;
  topInset: number;
  routeTitle?: string;
};

export const NavigationHeaderContext = createContext<
  NavigationHeaderState | undefined
>(undefined);

export const useNavigationHeader = () => useContext(NavigationHeaderContext);
