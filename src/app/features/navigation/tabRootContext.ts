import { createContext, useContext } from "react";

/** True when a screen is the root of a bottom-bar tab (not pushed on top). */
export const TabRootContext = createContext(false);
export const useIsTabRoot = () => useContext(TabRootContext);

/** Tab roots that draw their own in-page header instead of a fixed bar. */
export const inPageHeaderTabs = ["home", "inbox", "reviews"] as const;
