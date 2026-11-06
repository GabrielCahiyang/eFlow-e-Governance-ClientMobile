import { createContext, useContext } from "react";

export const WorkspaceNavigationContext = createContext({
  openWorkspace: () => {},
  openFavorites: () => {},
  chooseWorkspace: async (_id: string) => {},
  workspaceChooserOpen: false,
});
export const useWorkspaceNavigation = () =>
  useContext(WorkspaceNavigationContext);
