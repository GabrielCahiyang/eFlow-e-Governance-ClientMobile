import type { SidebarContent } from "../sidebarTypes";


export const sidebarContentByRole: Record<string, Record<string, SidebarContent>> = {
  admin: superadminSidebar,
};